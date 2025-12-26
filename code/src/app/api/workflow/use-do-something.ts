import { logger } from '@/lib/logger';
import { FatalError, RetryableError, } from "workflow";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function buyGroceries() {
  "use step";
  await sleep(2000);
  logger.info(`Completed: buying groceries`);
  return 'success'
}

async function clean(input: string) {
  "use step";
  const isSuccess = Math.random() > 0.4;
  await sleep(3000);
  if (!isSuccess) {
    throw new Error('Step failed');
  }
  logger.info(`Completed: cleaning the house, with input: ${input}`);
}

async function doOther() {
  "use step";
  const isSuccess = Math.random() > 0.4;
  await sleep(3000);
  if (!isSuccess) {
    throw new RetryableError('Step failed, please retry', {
      retryAfter: 2000,
    });
  }
  logger.info(`Completed: doOther`);
}

async function payBills() {
  "use step";
  const isSuccess = Math.random() > 0.2;
  await sleep(3000);
  if (!isSuccess) {
    // skip retry by throwing FatalError
    throw new FatalError('Step failed');
  }
  logger.info(`Completed: paying bills`);
}

payBills.maxRetries = 3; // define if 5

export const processWorkflow = async () => {
  "use workflow";
  await buyGroceries();
  await Promise.all(
    [
      clean('xxx'),
      doOther()
    ]
  )
  await Promise.race(
    [
      clean('xxx2'),
      doOther()
    ]
  )
  await payBills();
  return 'all success';
}
