import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { sendEmail } from './sendEmail.js';

const redisUrl = process.env.REDIS_URL;
let connection = null;
let emailQueue = null;
let worker = null;
let isRedisAvailable = false;

if (redisUrl) {
  try {
    console.log('⚡ Initializing Redis connection for BullMQ...');
    connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });

    connection.on('error', (err) => {
      if (isRedisAvailable) {
        console.warn('⚠️ BullMQ Redis connection lost. Falling back to direct/in-memory background processing.');
        isRedisAvailable = false;
      }
    });

    connection.on('connect', () => {
      console.log('✅ BullMQ Redis connection established successfully.');
      isRedisAvailable = true;
      initializeQueueAndWorker();
    });
  } catch (err) {
    console.error('❌ Failed to construct Redis connection for BullMQ:', err);
    isRedisAvailable = false;
  }
} else {
  console.warn('⚠️ REDIS_URL not set in environment. BullMQ background processor will fall back to direct/in-memory mode.');
}

function initializeQueueAndWorker() {
  if (!connection) return;
  try {
    // Avoid double initialization
    if (emailQueue) return;

    emailQueue = new Queue('email-queue', { connection });

    worker = new Worker(
      'email-queue',
      async (job) => {
        const { name, data } = job;
        console.log(`📥 [BullMQ Worker] Processing job ${job.id} of type '${name}'...`);
        if (name === 'sendEmail') {
          await sendEmail(data);
        } else {
          console.warn(`⚠️ [BullMQ Worker] Unknown job type: ${name}`);
        }
      },
      { connection }
    );

    worker.on('completed', (job) => {
      console.log(`✅ [BullMQ Worker] Job ${job.id} of type '${job.name}' completed successfully.`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ [BullMQ Worker] Job ${job?.id} of type '${job?.name}' failed:`, err);
    });

    console.log('✅ BullMQ Email Queue and Worker initialized.');
  } catch (err) {
    console.error('❌ Failed to initialize BullMQ Queue or Worker:', err);
    isRedisAvailable = false;
  }
}

/**
 * Adds a job to the background queue, or executes it immediately in the background if Redis is offline.
 * @param {string} jobName Name of the job to run
 * @param {object} data Job parameters/payload
 */
export const addJob = async (jobName, data) => {
  if (isRedisAvailable && emailQueue) {
    try {
      await emailQueue.add(jobName, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
      console.log(`📩 Job '${jobName}' added to BullMQ.`);
      return;
    } catch (err) {
      console.error(`⚠️ Failed to queue job '${jobName}' in BullMQ:`, err);
      // Fall through to immediate fallback execution
    }
  }

  // Fallback: Run it asynchronously in the background using Node's event loop
  console.warn(`⚠️ Redis is down or not configured. Running job '${jobName}' asynchronously in local memory.`);
  setImmediate(async () => {
    try {
      if (jobName === 'sendEmail') {
        await sendEmail(data);
      } else {
        console.error(`❌ Unknown job name in fallback runner: ${jobName}`);
      }
    } catch (err) {
      console.error(`❌ Fallback execution of job '${jobName}' failed:`, err);
    }
  });
};
