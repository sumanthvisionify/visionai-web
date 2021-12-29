'use-strict';

const { createServer } = require('net');
const { EventEmitter } = require('events');
const { spawn } = require('child_process');

const cameraUtils = require('../utils/camera.utils');

const { LoggerService } = require('../../../services/logger/logger.service');
const { ConfigService } = require('../../../services/config/config.service');

const { log } = LoggerService;

const compatibleAudio = /(aac|mp3|mp2)/;
const prebufferDurationMs = 10000;

class PrebufferService {
  #camera;
  #mediaService;
  #videoProcessor = ConfigService.ui.options.videoProcessor;

  prebuffers = {
    mp4: [],
    mpegts: [],
  };
  events = new EventEmitter();
  released = false;
  ftyp = null;
  moov = null;
  idrInterval = 0;
  prevIdr = 0;
  prebufferSession = null;
  killed = false;
  watchdog = null;
  parsers = {};

  constructor(camera, mediaService) {
    //log.debug('Initializing camera prebuffering', camera.name);
    this.reconfigure(camera, mediaService);
  }

  reconfigure(camera, mediaService) {
    this.#camera = camera;
    this.#mediaService = mediaService;

    this.cameraName = camera.name;
    this.debug = camera.videoConfig.debug;
    this.ffmpegInput = camera.videoConfig.source;

    //todo: for reconfiguring during runtime
    //this.restart();
  }

  async start() {
    try {
      this.resetPrebuffer();
      this.prebufferSession = await this.startPrebufferSession();
    } catch (error) {
      log.info('An error occured during starting camera prebuffer!', this.cameraName, 'prebuffer');
      log.error(error, this.cameraName, 'prebuffer');

      console.log(error);

      setTimeout(() => this.restart(), 10000);
    }
  }

  resetPrebuffer() {
    this.prebufferSession = null;
    this.killed = false;
    this.prebufferFmp4 = {
      mp4: [],
      mpegts: [],
    };
    this.released = false;
    this.ftyp = null;
    this.moov = null;
    this.idrInterval = 0;
    this.prevIdr = 0;
    this.events.removeAllListeners();
    this.watchdog = null;
    this.parsers = {};
  }

  stop(killed) {
    if (this.prebufferSession) {
      if (killed) {
        this.killed = true;
      }

      if (this.watchdog) {
        clearTimeout(this.watchdog);
      }

      this.prebufferSession.kill();
    }
  }

  restart() {
    this.stop(false);
    setTimeout(() => this.start(), 5000);
  }

  async startPrebufferSession() {
    if (this.prebufferSession) {
      return this.prebufferSession;
    }

    log.debug('Start prebuffering...', this.cameraName);

    let audioEnabled = this.#camera.videoConfig.audio;
    let acodec = this.#camera.videoConfig.acodec || 'libfdk_aac';
    let audioSourceFound = this.#mediaService.codecs.audio.length;
    let probeAudio = this.#mediaService.codecs.audio;
    let incompatibleAudio = audioSourceFound && !probeAudio.some((codec) => compatibleAudio.test(codec));
    let probeTimedOut = this.#mediaService.codecs.timedout;

    const ffmpegInput = ['-hide_banner', '-loglevel', 'error', '-fflags', '+genpts', ...this.ffmpegInput.split(' ')];

    const audioArguments = [];

    /*if (audioEnabled && incompatibleAudio) {
      log.warn(`Skip transcoding audio, incompatible audio detected (${probeAudio.toString()})`, this.cameraName, 'prebuffer');
      audioEnabled = false;
    }*/

    if (!audioSourceFound) {
      if (!probeTimedOut) {
        //acodec = 'copy';
        audioEnabled = false;
      } else if (audioEnabled) {
        log.warn(
          'Turning off audio, audio source not found or timed out during probe stream',
          this.cameraName,
          'prebuffer'
        );
        audioEnabled = false;
      }
    }

    if (audioEnabled) {
      if (incompatibleAudio && acodec !== 'libfdk_aac') {
        log.warn(
          `Incompatible audio stream detected ${probeAudio}, transcoding with "libfdk_aac"..`,
          this.cameraName,
          'prebuffer'
        );
        acodec = 'libfdk_aac';
      } else if (!incompatibleAudio && acodec !== 'copy') {
        log.info('Compatible audio stream detected, copying..');
        acodec = 'copy';
      }

      if (acodec !== 'copy') {
        audioArguments.push(
          '-bsf:a',
          'aac_adtstoasc',
          '-acodec',
          'libfdk_aac',
          '-profile:a',
          'aac_low',
          '-flags',
          '+global_header',
          '-ar',
          '8k',
          '-b:a',
          '100k',
          '-ac',
          '1'
        );
      } else {
        audioArguments.push('-bsf:a', 'aac_adtstoasc', '-acodec', 'copy');
      }
    } else {
      audioArguments.push('-an');
    }

    const videoArguments = ['-vcodec', 'copy'];

    this.parsers = {
      mp4: cameraUtils.createFragmentedMp4Parser(videoArguments, audioArguments),
      mpegts: cameraUtils.createMpegTsParser(videoArguments, audioArguments),
    };

    const session = await this.startRebroadcastSession(this.#videoProcessor, ffmpegInput, {
      parsers: this.parsers,
    });

    const restartWatchdog = () => {
      clearTimeout(this.watchdog);
      this.watchdog = setTimeout(() => {
        log.error('Watchdog for mp4 parser timed out... killing ffmpeg session', this.cameraName, 'prebuffer');
        session.kill();
      }, 60000);
    };

    session.events.on('mp4-data', restartWatchdog);

    session.events.once('killed', () => {
      this.prebufferSession = undefined;
      session.events.removeListener('mp4-data', restartWatchdog);
      clearTimeout(this.watchdog);
    });

    restartWatchdog();

    for (const container of ['mpegts', 'mp4']) {
      const eventName = container + '-data';
      let prebufferContainer = this.prebuffers[container];
      let shifts = 0;

      session.events.on(eventName, (chunk) => {
        const now = Date.now();

        if (chunk.type === 'mdat') {
          if (this.prevIdr) {
            this.idrInterval = now - this.prevIdr;
          }

          this.prevIdr = now;
        }

        prebufferContainer.push({
          time: now,
          chunk,
        });

        while (prebufferContainer.length > 0 && prebufferContainer[0].time < now - prebufferDurationMs) {
          prebufferContainer.shift();
          shifts++;
        }

        if (shifts > 1000) {
          prebufferContainer = this.prebuffers[container] = [...prebufferContainer];
          shifts = 0;
        }

        this.events.emit(eventName, chunk);
      });
    }

    return session;
  }

  async getVideo(options) {
    if (this.prebufferSession) {
      const requestedPrebuffer = options?.prebuffer || Math.max(4000, this.idrInterval || 4000) * 1.5;

      log.debug(`Prebuffer requested with a duration of -${requestedPrebuffer / 1000}s`, this.cameraName);

      const createContainerServer = async (container) => {
        const eventName = container + '-data';
        const prebufferContainer = this.prebuffers[container];

        const { server, port } = await this.createRebroadcaster({
          connect: (writeData, destroy) => {
            server.close();
            const now = Date.now();

            const safeWriteData = (chunk) => {
              const buffered = writeData(chunk);
              if (buffered > 100000000) {
                log.debug(
                  'More than 100MB has been buffered, did downstream die? killing connection.',
                  this.cameraName
                );
                cleanup();
              }
            };

            const cleanup = () => {
              destroy();
              log.debug('Prebuffer request ended', this.cameraName);
              this.events.removeListener(eventName, safeWriteData);
              this.prebufferSession.events.removeListener('killed', cleanup);
            };

            this.events.on(eventName, safeWriteData);
            this.prebufferSession.events.once('killed', cleanup);

            const parser = this.parsers[container];
            const availablePrebuffers = parser.findSyncFrame(
              prebufferContainer.filter((pb) => pb.time >= now - requestedPrebuffer).map((pb) => pb.chunk)
            );

            for (const prebuffer of availablePrebuffers) {
              safeWriteData(prebuffer);
            }

            return cleanup;
          },
        });

        setTimeout(() => server.close(), 30000);

        return port;
      };

      const container = options?.container || 'mpegts';
      const url = `tcp://127.0.0.1:${await createContainerServer(container)}`;

      const arguments_ = ['-f', container, '-i', url];

      if (options?.ffmpegInputArgs) {
        arguments_.unshift(...options.ffmpegInputArgs);
      }

      if (options?.ffmpegOutputArgs) {
        arguments_.push(...options.ffmpegOutputArgs);
      }

      return arguments_;
    } else {
      throw new Error('Prebuffer process not started!');
    }
  }

  async createRebroadcaster(options) {
    const server = createServer((socket) => {
      let first = true;

      const writeData = (data) => {
        if (first) {
          first = false;

          if (data.startStream) {
            socket.write(data.startStream);
          }
        }

        for (const chunk of data.chunks) {
          socket.write(chunk);
        }

        return socket.writableLength;
      };

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
        const callback = cleanupCallback;
        cleanupCallback = undefined;
        callback?.();
      };

      let cleanupCallback = options?.connect(writeData, cleanup);

      socket.on('end', cleanup);
      socket.on('close', cleanup);
      socket.on('error', cleanup);
    });

    const port = await cameraUtils.listenServer(server);

    return {
      server,
      port,
    };
  }

  async startRebroadcastSession(videoProcessor, ffmpegInput, options) {
    const events = new EventEmitter();

    let clients = 0;
    let dataTimeout;
    let ffmpegIncomingConnectionTimeout;
    let isActive = true;

    let resolve;
    let reject;

    //events.on('error', (error) => log.error(error, this.cameraName));

    const socketPromise = new Promise((r, rj) => {
      resolve = r;
      reject = rj;
    });

    function kill() {
      if (isActive) {
        events.emit('killed');
        //events.emit('error', new Error('killed'));
      }

      isActive = false;
      cp?.kill();

      for (const server of servers) {
        server?.close();
      }

      reject(new Error('FFmpeg was killed before connecting to the rebroadcast session'));
      clearTimeout(dataTimeout);
      clearTimeout(ffmpegIncomingConnectionTimeout);
    }

    function resetActivityTimer() {
      if (!options.timeout) return;
      clearTimeout(dataTimeout);
      dataTimeout = setTimeout(kill, options.timeout);
    }

    resetActivityTimer();

    const ffmpegInputs = {};
    const arguments_ = [...ffmpegInput];
    const servers = [];

    ffmpegIncomingConnectionTimeout = setTimeout(kill, 30000);

    for (const container of Object.keys(options.parsers)) {
      const parser = options.parsers[container];
      const eventName = container + '-data';

      {
        const { server: rebroadcast, port: rebroadcastPort } = await this.createRebroadcaster({
          connect: (writeData, destroy) => {
            clients++;
            clearTimeout(dataTimeout);

            const cleanup = () => {
              events.removeListener(eventName, writeData);
              events.removeListener('killed', destroy);
              clients--;
              if (clients === 0) {
                resetActivityTimer();
              }
              destroy();
            };
            events.on(eventName, writeData);
            events.once('killed', cleanup);

            return cleanup;
          },
        });

        servers.push(rebroadcast);

        const url = `tcp://127.0.0.1:${rebroadcastPort}`;
        ffmpegInputs[container] = {
          url,
          inputArguments: ['-f', container, '-i', url],
        };
      }

      const server = createServer(async (socket) => {
        server.close();

        resolve(socket);

        try {
          const eventName = container + '-data';
          for await (const chunk of parser.parse(socket)) {
            events.emit(eventName, chunk);
          }
        } catch (error) {
          //log.info('Rebroadcast parse error');
          log.error(error, this.cameraName, 'prebuffer');
          kill();
        }
      });

      servers.push(server);

      const serverPort = await cameraUtils.listenServer(server);

      arguments_.push(...parser.outputArguments, `tcp://127.0.0.1:${serverPort}`);
    }

    log.debug(`Prebuffering command: ${this.#videoProcessor} ${arguments_.join(' ')}`, this.cameraName);

    const cp = spawn(videoProcessor, arguments_);

    const errors = [];

    /*if (this.debug) {
      cp.stdout.on('data', (data) => log.debug(data.toString(), this.cameraName));
    }
    cp.stderr.on('data', (data) => log.error(data.toString().replace(/(\r\n|\n|\r)/gm, ''), this.cameraName, 'prebuffer'));*/

    cp.stdout.on('data', (data) => errors.push(data.toString().replace(/(\r\n|\n|\r)/gm, '')));

    cp.on('exit', (code, signal) => {
      if (code === 1) {
        errors.unshift(`FFmpeg prebuffer process exited with error! (${signal})`);
        log.error(errors.join(' - '), this.cameraName, 'prebuffer');
      } else {
        log.debug('FFmpeg prebuffer process exited (expected)', this.cameraName);
      }
    });

    cp.on('close', () => {
      kill();

      log.debug('Prebufferring process closed', this.cameraName);

      if (!this.killed) {
        this.restart();
      }
    });

    await socketPromise;

    clearTimeout(ffmpegIncomingConnectionTimeout);

    return {
      events,
      isActive() {
        return isActive;
      },
      kill,
      servers,
      cp,
      ffmpegInputs,
    };
  }
}

exports.PrebufferService = PrebufferService;
