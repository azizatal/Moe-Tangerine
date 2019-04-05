import { Injectable } from '@nestjs/common';
const DB = require('./db')
import { TangerineConfigService } from './shared/services/tangerine-config/tangerine-config.service';
import { GroupService } from './shared/services/group/group.service';
const reportingWorker = require('./reporting/reporting-worker')
const log = require('tangy-log').log
const util = require('util');
const exec = util.promisify(require('child_process').exec)
const sleep = (milliseconds) => new Promise((res) => setTimeout(() => res(true), milliseconds))

@Injectable()
export class AppService {

  constructor(
    private readonly groupService:GroupService,
    private readonly configService: TangerineConfigService
  ) { }

  installed = false
  appDb = new DB('app')

  async start() {
    const config = this.configService.config()
    try {
      await this.appDb.get('installed')
      this.installed = true
    }
    catch(e) {
      await this.install()
      this.installed = true
    }
    this.keepAliveReportingWorker()
  }

  async install() {
    this.appDb.put({_id: 'version', value: process.env.TANGERINE_VERSION})
    this.appDb.put({_id: 'installed', value: true})
  }

  async keepAliveReportingWorker() {
    let groupsList = await this.groupService.listGroups()
    const newGroupQueue = []
    this.groupService.groups$.subscribe({
      next: (group) => {
        console.log('Queueing...')
        console.log(group)
        newGroupQueue.push(group)
      }
    })
    await reportingWorker.prepare(groupsList)
    let workerState = await reportingWorker.getWorkerState()
    // Keep alive.
    while (true) {
      try {
        workerState = await reportingWorker.getWorkerState()
        // Add new groups if there are entries in the newGroupQueue array.
        while (newGroupQueue.length > 0) {
          await reportingWorker.addGroup(newGroupQueue.pop())
          groupsList = await this.groupService.listGroups()
        }
        await exec('reporting-worker-batch')
        workerState = await reportingWorker.getWorkerState()
        if (workerState.hasOwnProperty('processed') === false || workerState.processed === 0) {
          await sleep(this.configService.config().reportingDelay)
        } else {
          log.info(`Processed ${workerState.processed} changes.`)
        }
      } catch (error) {
        log.error('Reporting process had an error.')
        console.log(error)
        await sleep(3*1000)
      }
    }
  }
  
}
