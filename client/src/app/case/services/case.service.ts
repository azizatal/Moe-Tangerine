import { TangyFormResponseModel } from 'tangy-form/tangy-form-response-model.js';
import { DeviceService } from './../../device/services/device.service';
import { CASE_EVENT_STATUS_REVIEWED, CASE_EVENT_STATUS_COMPLETED, CASE_EVENT_STATUS_IN_PROGRESS } from './../classes/case-event.class';
import { EventFormDefinition } from './../classes/event-form-definition.class';
import { UserDatabase } from './../../shared/_classes/user-database.class';
import { CaseEventDefinition } from '../classes/case-event-definition.class'
import { Case } from '../classes/case.class'
import { CaseEvent } from '../classes/case-event.class'
import { EventForm } from '../classes/event-form.class'
import { CaseDefinition } from '../classes/case-definition.class';
import { CaseDefinitionsService } from './case-definitions.service';
import * as UUID from 'uuid/v4'
import { TangyFormService } from 'src/app/tangy-forms/tangy-form.service';
import { Injectable } from '@angular/core';
import { UserService } from 'src/app/shared/_services/user.service';
import { Query } from '../classes/query.class'
import moment from 'moment/src/moment';
import { HttpClient } from '@angular/common/http';
import { CaseParticipant } from '../classes/case-participant.class';

@Injectable({
  providedIn: 'root'
})
class CaseService {

  _id:string
  _rev:string
  db:UserDatabase
  case:Case
  caseDefinition:CaseDefinition

  queryCaseEventDefinitionId: any
  queryEventFormDefinitionId: any
  queryFormId: any

  openCaseConfirmed = false

  constructor(
    private tangyFormService: TangyFormService,
    private caseDefinitionsService: CaseDefinitionsService,
    private deviceService:DeviceService,
    private userService:UserService,
    private http:HttpClient
  ) {

    this.queryCaseEventDefinitionId = 'query-event';
    this.queryEventFormDefinitionId = 'query-form-event';
    this.queryFormId = 'query-form';

  }

  async create(caseDefinitionId) {
    this.caseDefinition = <CaseDefinition>(await this.caseDefinitionsService.load())
      .find(caseDefinition => caseDefinition.id === caseDefinitionId)
    this.case = new Case({caseDefinitionId, events: [], _id: UUID()})
    delete this.case._rev
    const tangyFormContainerEl:any = document.createElement('div')
    tangyFormContainerEl.innerHTML = await this.tangyFormService.getFormMarkup(this.caseDefinition.formId)
    const tangyFormEl = tangyFormContainerEl.querySelector('tangy-form')
    tangyFormEl.style.display = 'none'
    document.body.appendChild(tangyFormContainerEl)
    try {
      const device = await this.deviceService.getDevice()
      this.case.location = device.assignedLocation.value.reduce((location, levelInfo) => { return {...location, [levelInfo.level]: levelInfo.value}}, {})
    } catch(error) {
      console.log("There was error setting the location on the case.")
      console.log(error)
    }
    this.case.form = tangyFormEl.getProps()
    this.case.items = []
    tangyFormEl.querySelectorAll('tangy-form-item').forEach((item) => {
      this.case.items.push(item.getProps())
    })
    tangyFormEl.querySelectorAll('tangy-form-item')[0].submit()
    this.case.items[0].inputs = tangyFormEl.querySelectorAll('tangy-form-item')[0].inputs
    tangyFormEl.response = this.case
    this.case = {...this.case, ...tangyFormEl.response}
    tangyFormContainerEl.remove()
    await this.setCase(this.case)
    this.case.caseDefinitionId = caseDefinitionId;
    this.case.label = this.caseDefinition.name
    await this.save()
  }

  async setCase(caseInstance) {
    this.case = caseInstance
    this.caseDefinition = (await this.caseDefinitionsService.load())
      .find(caseDefinition => caseDefinition.id === this.case.caseDefinitionId)

  }

  async load(id:string) {
    this.db = await this.userService.getUserDatabase(this.userService.getCurrentUser())
    await this.setCase(new Case(await this.db.get(id)))
  }

  async getCaseDefinitionByID(id:string) {
    return <CaseDefinition>await this.http.get(`./assets/${id}.json`)
      .toPromise()
  }

  async save() {
    this.db = await this.userService.getUserDatabase(this.userService.getCurrentUser())
    await this.db.put(this.case)
    await this.setCase(await this.db.get(this.case._id))
  }

  createEvent(eventDefinitionId:string, createRequiredEventForms = false): CaseEvent {
    const caseEventDefinition = this.caseDefinition
      .eventDefinitions
      .find(eventDefinition => eventDefinition.id === eventDefinitionId)
    const caseEvent = <CaseEvent>{
      id: UUID(),
      caseId: this.case._id,
      status: CASE_EVENT_STATUS_IN_PROGRESS,
      name: caseEventDefinition.name,
      estimate: true,
      caseEventDefinitionId: eventDefinitionId,
      windowEndDay: undefined,
      windowStartDay: undefined,
      estimatedDay: undefined,
      occurredOnDay: undefined,
      scheduledDay: undefined,
      eventForms: [],
      startDate: 0
    }
    this.case.events.push(caseEvent)
    for (const caseParticipant of this.case.participants) {
      for (const eventFormDefinition of caseEventDefinition.eventFormDefinitions) {
        if (caseParticipant.caseRoleId === eventFormDefinition.forCaseRole) {
          this.startEventForm(caseEvent.id, eventFormDefinition.id, caseParticipant.id)
        }
      }
    }
    return caseEvent
  }

  startEvent(eventId) {
    // ??
  }
  setEventEstimatedDay(eventId, timeInMs: number) {
    const estimatedDay = moment((new Date(timeInMs))).format('YYYY-MM-DD')
    this.case.events = this.case.events.map(event => {
      return event.id === eventId
        ? { ...event, ...{ estimatedDay } }
        : event
    })
  }
  setEventScheduledDay(eventId, timeInMs: number) {
    const scheduledDay = moment((new Date(timeInMs))).format('YYYY-MM-DD')
    this.case.events = this.case.events.map(event => {
      return event.id === eventId
        ? { ...event, ...{ scheduledDay } }
        : event
    })
  }
  setEventWindow(eventId: string, windowStartDayTimeInMs: number, windowEndDayTimeInMs: number) {
    const windowStartDay = moment((new Date(windowEndDayTimeInMs))).format('YYYY-MM-DD')
    const windowEndDay = moment((new Date(windowEndDayTimeInMs))).format('YYYY-MM-DD')
    this.case.events = this.case.events.map(event => {
      return event.id === eventId
        ? { ...event, ...{ windowStartDay, windowEndDay } }
        : event
    })
  }
  setEventOccurredOn(eventId, timeInMs: number) {
    const occurredOnDay = moment((new Date(timeInMs))).format('YYYY-MM-DD')
    return this.case.events = this.case.events.map(event => {
      return event.id === eventId
        ? { ...event, ...{ occurredOnDay } }
        : event
    })
  }
  startEventForm(caseEventId, eventFormDefinitionId, participantId = ''): EventForm {
    const eventForm = <EventForm>{
      id: UUID(),
      complete: false,
      caseId: this.case._id,
      participantId,
      caseEventId,
      eventFormDefinitionId: eventFormDefinitionId
    }
    this
      .case
      .events
      .find(caseEvent => caseEvent.id === caseEventId)
      .eventForms
      .push(eventForm)
    return eventForm
  }

  markEventFormComplete(caseEventId:string, eventFormId:string) {
    let caseEvent = this
      .case
      .events
      .find(caseEvent => caseEvent.id === caseEventId)
    let eventDefinition = this
      .caseDefinition
      .eventDefinitions
      .find(eventDefinition => eventDefinition.id === caseEvent.caseEventDefinitionId)
    caseEvent
      .eventForms
      .find(eventForm => eventForm.id === eventFormId)
      .complete = true
    const allRequiredFormsComplete = caseEvent.eventForms.reduce((allRequiredFormsComplete, eventForm) => {
      if (allRequiredFormsComplete === false) {
        return false
      } else {
        const eventFormDefinition = eventDefinition
          .eventFormDefinitions
          .find(eventFormDefinition => eventFormDefinition.id === eventForm.eventFormDefinitionId )
        return !eventFormDefinition.required || (eventFormDefinition.required && eventForm.complete) ? true : false
      }
    }, true)
    this
      .case
      .events
      .find(caseEvent => caseEvent.id === caseEventId)
      .status = allRequiredFormsComplete ? CASE_EVENT_STATUS_COMPLETED : CASE_EVENT_STATUS_IN_PROGRESS
    // Check to see if all required Events are complete in Case. If so, mark Case complete.
    let numberOfCaseEventsRequired = this.caseDefinition
      .eventDefinitions
      .reduce((acc, definition) => definition.required ? acc + 1 : acc, 0)
    let numberOfUniqueCompleteCaseEvents = this.case
      .events
      .reduce((acc, instance) => instance.status === CASE_EVENT_STATUS_COMPLETED
          ? Array.from(new Set([...acc, instance.caseEventDefinitionId]))
          : acc
        , [])
        .length
    this
      .case
      .complete = numberOfCaseEventsRequired === numberOfUniqueCompleteCaseEvents ? true : false
  }

  disableEventDefinition(eventDefinitionId) {
    if (this.case.disabledEventDefinitionIds.indexOf(eventDefinitionId) === -1) {
      this.case.disabledEventDefinitionIds.push(eventDefinitionId)
    }
  }

  setVariable(variableName, value) {
    let input = this.case.items[0].inputs.find(input => input.name === variableName)
    if (input) {
      input.value = value
    } else {
      this.case.items[0].inputs.push({name: variableName, value: value})
    }
  }

  getVariable(variableName) {
    return this.case.items[0].inputs.find(input => input.name === variableName)
      ? this.case.items[0].inputs.find(input => input.name === variableName).value
      : undefined
  }

  createParticipant(caseRoleId = ''):CaseParticipant {
    const id = UUID()
    const data = {}
    const caseParticipant = <CaseParticipant>{
      id,
      caseRoleId,
      data
    }
    this.case.participants.push(caseParticipant)
    for (let caseEvent of this.case.events) {
      const caseEventDefinition = this
        .caseDefinition
        .eventDefinitions
        .find(eventDefinition => eventDefinition.id === caseEvent.caseEventDefinitionId)
      for (let eventFormDefinition of caseEventDefinition.eventFormDefinitions) {
        if (eventFormDefinition.forCaseRole === caseRoleId && eventFormDefinition.required) {
          this.startEventForm(caseEvent.id, eventFormDefinition.id, caseParticipant.id)
        }
      }
    }
    return caseParticipant
  }

  setParticipantData(participantId:string, key:string, value:string) {
    const index = this.case.participants.findIndex(participant => participant.id === participantId)
    this.case.participants[index].data[key] = value
  }

  getParticipantData(participantId:string, key:string) {
    return this.case.participants.find(participant => participant.id === participantId).data[key]
  }

  async getQueries (): Promise<Array<Query>> {
    const userDbName = this.userService.getCurrentUser();
    const queryForms = await this.tangyFormService.getResponsesByFormId(this.queryFormId);
    const queries = Array<Query>();
    for (const queryForm of queryForms) {
      const query = Object.create(Query);
      queryForm.items[0].inputs.map(q => (query[q.name] = q.value));
      if (query.queryStatus === 'Open') {
        queries.push(query);
      }
    }
    return queries;
  }

  async getOpenQueriesCount (): Promise<number> {
    return (await this.getQueries()).length;
  }

  async createQuery (
    { caseId, eventId, formId, formName, formTitle, participantId, variableName, queryType, queryDate, queryText }
      ): Promise<string> {
    caseId = this.case._id;
    let caseEvent = this.case.events
      .find(caseEventInfo => caseEventInfo.caseEventDefinitionId === this.queryCaseEventDefinitionId);

    if (caseEvent === undefined) {
        const newDate = moment(new Date(), 'YYYY-MM-DD').unix() * 1000;
        caseEvent = this.createEvent(this.queryCaseEventDefinitionId);
        await this.save();
      } else {
        caseEvent = this.case.events
        .find(caseEventInfo => caseEventInfo.caseEventDefinitionId === this.queryCaseEventDefinitionId);
      }

      const c = this.startEventForm(caseEvent.id, this.queryEventFormDefinitionId);
      await this.save();

      caseEvent = this.case.events.find(c => c.caseEventDefinitionId === this.queryCaseEventDefinitionId);
      const eventForm = caseEvent.eventForms.find(d => d.id === c.id);

      const referringCaseEvent: CaseEvent = this.case.events.find((event) => event.id === eventId);
      const referringEventName = referringCaseEvent.name;
      const formLink = '/case/event/form/' + caseId + '/' + eventId + '/' + formId;
      const queryLink = '/case/event/form/' + caseId + '/' + caseEvent.id + '/' + eventForm.id;

      const tangyFormContainerEl:any = document.createElement('div');
      tangyFormContainerEl.innerHTML = await this.tangyFormService.getFormMarkup(this.queryFormId);
      const tangyFormEl = tangyFormContainerEl.querySelector('tangy-form') ;
      tangyFormEl.style.display = 'none';
      document.body.appendChild(tangyFormContainerEl);

      tangyFormEl.newResponse();

      tangyFormEl.response.items[0].inputs = [
        { name: 'associatedCaseType', value: this.case.label },
        { name: 'associatedCaseId', value: caseId },
        { name: 'associatedEventId', value: eventId },
        { name: 'associatedFormId', value: formId },
        { name: 'associatedCaseName', value: participantId },
        { name: 'associatedEventName', value: referringEventName },
        { name: 'associatedFormName', value: formTitle },
        { name: 'associatedFormLink', value: formLink },
        { name: 'associatedVariable', value: variableName },
        { name: 'queryText', value: queryText },
        { name: 'queryId', value: 'N/A' },
        { name: 'queryDate', value: queryDate },
        { name: 'queryTypeId', value: queryType },
        { name: 'queryResponse', value: '' },
        { name: 'queryResponseDate', value: '' },
        { name: 'queryStatus', value: 'Open' },
        { name: 'queryLink', value: queryLink }
      ];

      //tangyFormEl.store.dispatch({ type: 'FORM_RESPONSE_COMPLETE' });

      this.db = await this.userService.getUserDatabase(this.userService.getCurrentUser());
      await this.db.put(tangyFormEl.response);

      const queryResponseId = tangyFormEl.response._id;
      eventForm.formResponseId = queryResponseId;
      await this.save();

      return queryResponseId;
  }

  getQuestionMarkup(form: string, question: string): Promise<string> {
    return this.tangyFormService.getFormMarkup(form);
  }

  async valueExists(form, variable, value) {
    const formResponses = await this.tangyFormService.getResponsesByFormId(form);
    for (let i = 0; i < formResponses.length; i++) {
      const formVariable = formResponses[i].inputs.find(input => input.name === variable);
      if (formVariable && formVariable.value === value) {
        return true;
      }
    }
    return false;
  }

  async export():Promise<Array<TangyFormResponseModel>> {
    const docs = [this.case]
    const formResponseDocIds = this.case.events.reduce((formResponseDocIds, caseEvent) => {
      return [
        ...formResponseDocIds,
        ...caseEvent.eventForms.map(eventForm => eventForm.formResponseId)
      ]
    }, [])
    for (let formResponseDocId of formResponseDocIds) {
      if (formResponseDocId) {
        const doc = await this.tangyFormService.getResponse(formResponseDocId)
        if (doc) {
          docs.push(await this.tangyFormService.getResponse(formResponseDocId))
        } else {
          console.log('No response for ' + formResponseDocId);
        }
      }
    }
    return docs
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  async getDocCount() {
    this.db.db.info().then(info => console.log(info.doc_count))
  }

  async generateCases(numberOfCases) {
    let numberOfCasesCompleted = 0
    let firstnames = ['Mary', 'Jennifer', 'Lisa', 'Sandra	','Michelle',
    'Patricia', 'Maria','Nancy','Donna','Laura', 'Linda','Susan','Karen',
      'Carol','Sarah','Barbara','Margaret','Betty','Ruth','Kimberly','Elizabeth',
      'Dorothy','Helen','Sharon','Deborah']
    let surnames = ['Smith','Johnson','Williams','Jones','Brown','Davis','Miller',
      'Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris',
      'Martin','Thompson','Garcia','Martinez','Robinson','Clark','Rodriguez','Lewis','Lee','Walker']

    while (numberOfCasesCompleted < numberOfCases) {
      const templateDocs = await this.export()
      const caseDoc = templateDocs.find(doc => doc['type'] === 'case')
      // Change the case's ID.
      const caseId = UUID()
      caseDoc._id = caseId
      const participant_id = Math.round(Math.random() * 1000000)
      // let firstname = "Helen" + Math.round(Math.random() * 100)
      // let surname = "Smith" + Math.round(Math.random() * 100)
      const firstname = firstnames[this.getRandomInt(0, firstnames.length + 1)]
      const surname = surnames[this.getRandomInt(0, surnames.length + 1)]
      let barcode_data =  { "participant_id": participant_id, "treatment_assignment": "Experiment", "bin-mother": "A", "bin-infant": "B", "sub-studies": { "S1": true, "S2": false, "S3": false, "S4": true } }
      let tangerineModifiedOn = new Date();
      // tangerineModifiedOn is set to numberOfCasesCompleted days before today, and its time is set based upon numberOfCasesCompleted.
      tangerineModifiedOn.setDate( tangerineModifiedOn.getDate() - numberOfCasesCompleted );
      tangerineModifiedOn.setTime( tangerineModifiedOn.getTime() - ( numberOfCases - numberOfCasesCompleted ) )
      const day = String(tangerineModifiedOn.getDate()).padStart(2, '0');
      const month = String(tangerineModifiedOn.getMonth() + 1).padStart(2, '0');
      const year = tangerineModifiedOn.getFullYear();
      const screening_date = year + '-' + month + '-' + day;
      const enrollment_date = screening_date;
      let caseMother = {
        _id: caseId,
        tangerineModifiedOn: tangerineModifiedOn,
        "participants": [{
          "id": participant_id,
          "caseRoleId": "mother-role",
          "data": {
            "firstname": firstname,
            "surname": surname,
            "participant_id": participant_id
          }
        }],
      }
      console.log("motherId: " + caseId + " participantId: " + participant_id);
      const doc = Object.assign({}, caseDoc, caseMother);
      caseDoc.items[0].inputs[1].value = participant_id;
      caseDoc.items[0].inputs[2].value = enrollment_date;
      caseDoc.items[0].inputs[8].value = firstname;
      caseDoc.items[0].inputs[10].value = surname;
      for (let caseEvent of caseDoc['events']) {
        const caseEventId = UUID()
        caseEvent.id = caseEventId
        for (let eventForm of caseEvent.eventForms) {
          eventForm.id = UUID()
          eventForm.caseId = caseId
          eventForm.caseEventId = caseEventId
          // Some eventForms might not have a corresponding form response.
          if (eventForm.formResponseId) {
            const originalId = `${eventForm.formResponseId}`
            const newId = UUID()
            // Replace originalId with newId in both the reference to the FormResponse doc and the FormResponse doc itself.
            eventForm.formResponseId = newId
            const formResponse = templateDocs.find(doc => doc._id === originalId)
            if (!formResponse) {
              debugger
            }
            formResponse._id = newId
          }
        }
      }
      // modify the demographics form - s01a-participant-information-f254b9
      const demoDoc = templateDocs.find(doc => doc.form.id === 's01a-participant-information-f254b9')
      demoDoc.items[0].inputs[4].value = screening_date;
      // "id": "randomization",
      demoDoc.items[10].inputs[1].value = barcode_data;
      demoDoc.items[10].inputs[2].value = participant_id;
      demoDoc.items[10].inputs[7].value = enrollment_date;
      // "id": "participant_information",
      demoDoc.items[12].inputs[2].value = surname;
      demoDoc.items[12].inputs[3].value = firstname;

      this.db = await this.userService.getUserDatabase(this.userService.getCurrentUser())

      for (let doc of templateDocs) {
        // @ts-ignore
        // sometimes doc is false...
        if (doc !== false) {
          try {
            delete doc._rev
            await this.db.put(doc)
          } catch (e) {
            console.log('Error: ' + e)
          }
        }
      }
      numberOfCasesCompleted++
    }
  }

}

export { CaseService };
