import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CaseEventScheduleListComponent, CASE_EVENT_SCHEDULE_LIST_MODE_WEEKLY } from './case-event-schedule-list.component';
import { CaseEvent } from '../../classes/case-event.class';
import { CasesService } from '../../services/cases.service';
import { SearchService } from 'src/app/shared/_services/search.service';
import { MockSearchService } from 'src/app/mocks/services/mock-search.service';
import { TangyFormsInfoService } from 'src/app/tangy-forms/tangy-forms-info-service';
import { MockTangyFormsInfoService } from 'src/app/mocks/services/mock-tangy-forms-info.service';
import { UserService } from 'src/app/shared/_services/user.service';
import { subscribeOn } from 'rxjs/operators';

class MockPouchDB {
  get(id) {
    switch (id) {
      case 'response1': 
        return {
          _id: 'response1',
          form: {
            id: 'form1'
          }
        }
      case 'response2':
        return {
          _id: 'response2',
          form: {
            id: 'form2'
          }
        }
    }
  }
}

class MockUserService {
  getCurrentUser() {
    return 'test-user'
  }
  getUserDatabase(username) {
    return new MockPouchDB()
  }
}

const REFERENCE_TIME = 1558715176000

class MockCasesService {

  async getEventsByDate (username:string, dateStart, dateEnd, excludeEstimates = false):Promise<Array<CaseEvent>> {
    return [
      <CaseEvent>{
        id: 'e1',
        caseId: 'response1',
        caseEventDefinitionId: 'c1',
        complete: false,
        eventForms: [],
        estimate: false,
        dateStart: REFERENCE_TIME,
        dateEnd: REFERENCE_TIME + (1000*60*60)
      },
      <CaseEvent>{
        id: 'e2',
        caseId: 'response1',
        caseEventDefinitionId: 'c1',
        complete: false,
        eventForms: [],
        estimate: false,
        dateStart: REFERENCE_TIME,
        dateEnd: REFERENCE_TIME + (1000*60*60)
      },
      <CaseEvent>{
        id: 'e3',
        caseId: 'response1',
        caseEventDefinitionId: 'c1',
        complete: false,
        eventForms: [],
        estimate: false,
        dateStart: REFERENCE_TIME + (1000*60*60*24),
        dateEnd: REFERENCE_TIME + (1000*60*60*24) + (1000*60*60)
      }
    ]
  }
}

describe('CaseEventScheduleListComponent', () => {
  let component: CaseEventScheduleListComponent;
  let fixture: ComponentFixture<CaseEventScheduleListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserService,
          useClass: MockUserService
        },
        {
          provide: CasesService,
          useClass: MockCasesService
        },
        {
          provide: SearchService,
          useClass: MockSearchService
        },
        {
          provide: TangyFormsInfoService,
          useClass: MockTangyFormsInfoService
        },

      ],
      declarations: [ CaseEventScheduleListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CaseEventScheduleListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show day view', (done) => {
    expect(component).toBeTruthy();
    component.didSearch$.subscribe((value) => {
      expect(component.listEl.nativeElement.querySelectorAll('.search-result').length).toEqual(3)
      done()
    })
    component.date = REFERENCE_TIME
  });

  it('should show week view', (done) => {
    expect(component).toBeTruthy();
    let i = 0
    component.didSearch$.subscribe((value) => {
      i++
      if (i === 2) {
        expect(component.listEl.nativeElement.querySelectorAll('.date').length).toEqual(2)
        done()
      }
    })
    component.date = REFERENCE_TIME
    component.mode = CASE_EVENT_SCHEDULE_LIST_MODE_WEEKLY
  });

});
