import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import PouchDB from 'pouchdb';
import {AuthenticationService} from "../../core/auth/_services/authentication.service";

// A dummy function so TS does not complain about our use of emit in our pouchdb queries.
const emit = (key, value) => {
  return true;
}
@Injectable()
export class DashboardService {

  constructor(
    authenticationService: AuthenticationService,
    private http: HttpClient
  ) {
    this.userDB = new PouchDB
    (authenticationService.getCurrentUserDBPath());
  }

  userDB;
  db:any;
  databaseName: String;

  async getFormList() {
    const formList:any = await this.http.get('./assets/forms.json')
      .toPromise()

    return formList;
  }

  async getCurriculaForms(curriculum) {
    let formHtml =  await this.http.get(`./assets/${curriculum}/form.html`, {responseType: 'text'}).toPromise();
    return formHtml;
  }

  async getMyClasses() {
    const result = await this.userDB.query('tangy-form/responsesByFormId', {
      key: 'class-registration',
      include_docs: true
    });
    return result.rows;
  }

  async getMyStudents(selectedClass: any) {
    const result = await this.userDB.query('tangy-class/responsesForStudentRegByClassId', {
      key: selectedClass,
      include_docs: true
    });
    return result.rows;
  }

  async getResultsByClass(classId: any, forms) {
    const result = await this.userDB.query('tangy-class/responsesByClassId', {
      key: classId,
      include_docs: true
    });
    const data = await this.transformResultSet(result.rows, forms);
    // clean the array
    let cleanData = this.clean(data, undefined);
    return cleanData;
  }

  clean = function(obj, deleteValue) {
    for (var i = 0; i < obj.length; i++) {
      if (obj[i] == deleteValue) {
        obj.splice(i, 1);
        i--;
      }
    }
    return obj;
  };

  async transformResultSet(result, formList) {
    // const appConfig = await this.appConfigService.getAppConfig();
    // const columnsToShow = appConfig.columnsOnVisitsTab;
    const columnsToShow = ["studentId"];
    // const formList = await this.getCurriculaForms(curriculum);

    const observations = result.map(async (observation) => {
      let columns = await this.getDataForColumns(observation.doc['items'], columnsToShow);
      // columns = columns.filter(x => x !== undefined);
      const index = formList.findIndex(c => c.id === observation.doc.form['id']);
      if (formList[index]) {
        let response = {
          formTitle: formList[index]['title'],
          formId: formList[index]['id'],
          startDatetime: observation.doc.startDatetime,
          formIndex: index,
          _id: observation.doc._id,
          count: observation.doc['items'][0].inputs.length,
          columns
        };
        return response;
      }
    });
    return Promise.all(observations);
  }

  async getDataForColumns(array, columns) {
    let data = {}
      columns.map(column => {
      let input = array[0].inputs.find(input => (input.name === column) ? true : false)
      if (input) {
        data[column] = input.value;
      }
    });
    return data;
  }

}

