import PouchDB from 'pouchdb';
import { UserDatabase } from './../shared/_classes/user-database.class';
import { AppConfig } from './../shared/_classes/app-config.class';
import { SYNC_DOCS } from './sync.docs';
import { DEFAULT_USER_DOCS } from './../shared/_tokens/default-user-docs.token';
import { AppConfigService } from 'src/app/shared/_services/app-config.service';
import { FormInfo, CouchdbSyncSettings } from './../tangy-forms/classes/form-info.class';
import { TestBed, inject } from '@angular/core/testing';

import { SyncService, SYNC_MODE_COUCHDB, SYNC_MODE_ALL, SYNC_MODE_CUSTOM } from './sync.service';
import { HttpTestingController, HttpClientTestingModule } from '@angular/common/http/testing';
import { UserService } from 'src/app/shared/_services/user.service';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { UserSignup } from 'src/app/shared/_classes/user-signup.class';

const TEST_USERNAME = 'test-user'
const TEST_FORM_ID_1 = 'TEST_FORM_ID_1'
const TEST_FORM_ID_2 = 'TEST_FORM_ID_2'
const TEST_FORM_ID_3 = 'TEST_FORM_ID_3'
const MOCK_USER_ID = 'MOCK_USER_ID'

const TEST_FORM_INFOS_SYNC_COUCHDB = [

]

const MOCK_REMOTE_DOC_IDS = [
  'doc1',
  'doc2'
]

const MOCK_REMOTE_DB_INFO_1 = 'MOCK_REMOTE_DB_INFO_1'
const MOCK_LOCAL_DB_INFO_1 = 'MOCK_LOCAL_DB_INFO_1'
const MOCK_REMOTE_DB_INFO_2 = 'MOCK_REMOTE_DB_INFO_2'
const MOCK_LOCAL_DB_INFO_2 = 'MOCK_LOCAL_DB_INFO_2'

const MOCK_SERVER_URL = 'http://localhost/'

const MOCK_APP_CONFIG = <AppConfig>{
  serverUrl: MOCK_SERVER_URL,
  groupName: 'foo',
  sharedUserDatabase: false
}

class MockAppConfigService {
  getAppConfig():Promise<AppConfig> {
    return new Promise((resolve, reject) => {
      resolve(MOCK_APP_CONFIG)
    })
  }
}

class MockTangyFormService {
  async getFormsInfo() {
    return [
      {id: 'example1', src: './example1/form.json', title: 'Example 1'},
      {id: 'example2', src: './example2/form.json', title: 'Example 2'},
    ]
  }
}

class MockTangyFormInfoService {
  async getFormsInfo() {
    return [
      <FormInfo>{
        id: TEST_FORM_ID_1
      },
      <FormInfo>{
        id: TEST_FORM_ID_2
      }
    ]
  }
}

describe('syncService', () => {

  let httpClient: HttpClient
  let httpTestingController: HttpTestingController
  let userService: UserService
  let syncService: SyncService 
  let userDb: UserDatabase

  beforeEach(async() => { 
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule
      ],
      providers: [
      {provide: AppConfigService, useClass: MockAppConfigService},
       {
          provide: DEFAULT_USER_DOCS,
          useValue: SYNC_DOCS,
          multi: true
        },
        UserService,
        SyncService
 
      ]
    })
    // Get fresh injected instances.
    httpClient = TestBed.get(HttpClient);
    httpTestingController = TestBed.get(HttpTestingController);
    userService = TestBed.get(UserService);
    syncService = TestBed.get(SyncService)
    // Initialize to install docs.
    await userService.initialize()
    await userService.install()
    // Create the user.
    await userService.create(<UserSignup>{
      username: TEST_USERNAME,
      password: 'password',
      securityQuestionResponse: '...'
    })
    userDb = await userService.getUserDatabase(TEST_USERNAME)
  })

  afterEach(async () => {
    await userService.uninstall()
  })

  it('should be created', () => {
    expect(!!syncService).toEqual(true);
  })

  it('should have some form responses in queue, not others', async () => {
    const TEST_FORM_INFOS_SYNC_CUSTOM = [
      <FormInfo>{
        id: TEST_FORM_ID_1,
        customSyncSettings: {
          enabled: true,
          push: true,
          pull: false,
          excludeIncomplete: true 
        },
        couchdbSyncSettings: <CouchdbSyncSettings>{
          enabled: false,
          filterByLocation: false
        }
    
      },
      <FormInfo>{
        id: TEST_FORM_ID_2,
        customSyncSettings: {
          enabled: true,
          push: true,
          pull: false,
          excludeIncomplete: false 
        },
        couchdbSyncSettings: <CouchdbSyncSettings>{
          enabled: false,
          filterByLocation: false
        }
      },
      <FormInfo>{
        id: TEST_FORM_ID_3,
        customSyncSettings: {
          enabled: false,
          push: false,
          pull: false,
          excludeIncomplete: true
        },
        couchdbSyncSettings: <CouchdbSyncSettings>{
          enabled: true,
          filterByLocation: false
        }
      },
      <FormInfo>{
        id: 'user-profile',
        customSyncSettings: {
          enabled: true,
          push: false,
          pull: true,
          excludeIncomplete: false
        },
        couchdbSyncSettings: <CouchdbSyncSettings>{
          enabled: false,
          filterByLocation: false
        }
      }
    ]
    // Should not be in queue because TEST_FORM_ID_1 has excludeIncomplete: true  
    await userDb.post({
      _id: '1',
      collection: 'TangyFormResponse',
      form: {
        id: TEST_FORM_ID_1
      },
      complete: false
    })
    expect((await syncService.customUploadQueue(userDb, TEST_FORM_INFOS_SYNC_CUSTOM)).includes('1')).toEqual(false)
    // Should be in queue because TEST_FORM_ID_2 has excludeIncomplete: false  
    await userDb.post({
      _id: '2',
      collection: 'TangyFormResponse',
      form: {
        id: TEST_FORM_ID_2
      },
      complete: false
    })
    expect((await syncService.customUploadQueue(userDb, TEST_FORM_INFOS_SYNC_CUSTOM)).includes('2')).toEqual(true)
    // Should be in queue because it's set to push using couchdb replication.
    await userDb.post({
      _id: '3',
      collection: 'TangyFormResponse',
      form: {
        id: TEST_FORM_ID_3
      },
      complete: false
    })
    expect((await syncService.couchdbUploadQueue(userDb, TEST_FORM_INFOS_SYNC_CUSTOM)).includes('3')).toEqual(true)
    // Final checks.
    expect((await syncService.customUploadQueue(userDb, TEST_FORM_INFOS_SYNC_CUSTOM)).length).toEqual(1)
    expect((await syncService.couchdbUploadQueue(userDb, TEST_FORM_INFOS_SYNC_CUSTOM)).length).toEqual(1)
  })

  it('should custom sync and then have a reduced queue', async(done) => {
    const FORM_INFO = [
      <FormInfo>{
        id: TEST_FORM_ID_1,
        customSyncSettings: {
          enabled: true,
          push: true,
          pull: false,
          excludeIncomplete: false 
        },
        couchdbSyncSettings: <CouchdbSyncSettings>{
          enabled: false,
          filterByLocation: false
        }
    
      }
    ]
    const TEST_DOC = {
      _id: '1',
      collection: 'TangyFormResponse',
      form: {
        id: TEST_FORM_ID_1
      },
      items: [],
      complete: false
    }
    await userDb.post(TEST_DOC)
    expect((await syncService.customUploadQueue(userDb, FORM_INFO)).includes(TEST_DOC._id)).toEqual(true)
    syncService.customPush(userDb, MOCK_APP_CONFIG, [ TEST_DOC._id ]).then(async() => {
      expect((await syncService.customUploadQueue(userDb, FORM_INFO)).includes(TEST_DOC._id)).toEqual(false)
      done()
    })
    setTimeout(() => {
      const req = httpTestingController.expectOne(`${MOCK_APP_CONFIG.serverUrl}api/${MOCK_APP_CONFIG.groupName}/upload`);
      expect(req.request.method).toEqual('POST')
      req.flush({ status: 'ok' });
    }, 500)
  }, 2000)

  it('should couchdb sync and then have a reduced queue', async(done) => {
    const mockRemoteDb = new PouchDB(MOCK_REMOTE_DB_INFO_1)
    const FORM_INFOS = [
      <FormInfo>{
        id: TEST_FORM_ID_1,
        customSyncSettings: {
          enabled: true,
          push: true,
          pull: false,
          excludeIncomplete: false 
        },
        couchdbSyncSettings: <CouchdbSyncSettings>{
          enabled: false,
          filterByLocation: false
        }
      },
      <FormInfo>{
        id: TEST_FORM_ID_2,
        customSyncSettings: {
          enabled: false,
          push: false,
          pull: false,
          excludeIncomplete: false 
        },
        couchdbSyncSettings: <CouchdbSyncSettings>{
          enabled: true,
          filterByLocation: false 
        }
      }
    ]
    const TEST_DOC_1 = {
      _id: '1',
      collection: 'TangyFormResponse',
      form: {
        id: TEST_FORM_ID_1
      },
      items: [],
      complete: false
    }
    const TEST_DOC_2 = {
      _id: '2',
      collection: 'TangyFormResponse',
      form: {
        id: TEST_FORM_ID_2
      },
      items: [],
      complete: false
    }
    await userDb.post(TEST_DOC_1)
    await userDb.post(TEST_DOC_2)
    expect((await syncService.couchdbUploadQueue(userDb, FORM_INFOS)).includes(TEST_DOC_2._id)).toEqual(true)
    expect((await syncService.couchdbUploadQueue(userDb, FORM_INFOS)).length).toEqual(1)
    syncService.couchdbSync(userDb, MOCK_APP_CONFIG, FORM_INFOS, MOCK_USER_ID).then(async() => {
      expect((await syncService.couchdbUploadQueue(userDb, FORM_INFOS)).includes(TEST_DOC_2._id)).toEqual(false)
      expect((await syncService.couchdbUploadQueue(userDb, FORM_INFOS)).length).toEqual(0)
      expect((await mockRemoteDb.allDocs()).rows.length).toEqual(1)
      done()
    })
    setTimeout(() => {
      const req = httpTestingController.expectOne(`${MOCK_APP_CONFIG.serverUrl}sync-session/start/${MOCK_APP_CONFIG.groupName}/${MOCK_USER_ID}`);
      expect(req.request.method).toEqual('GET')
      req.flush(MOCK_REMOTE_DB_INFO_1);
    }, 500)
  }, 2000)
  
});