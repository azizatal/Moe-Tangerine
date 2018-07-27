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

  async getResultsByClass(classId: any, curriculumFormsList) {
    const result = await this.userDB.query('tangy-class/responsesByClassId', {
      key: classId,
      include_docs: true
    });
    const data = await this.transformResultSet(result.rows, curriculumFormsList);
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

  /**
   *
   * @param result
   * @param curriculumFormsList - use to find if the form is a grid subtest.
   * @returns {Promise<any[]>}
   */
  async transformResultSet(result, curriculumFormsList) {

    const observations = [];
    result.forEach(async observation => {
      // loop through the formList
      for (var i = 0; i < curriculumFormsList.length; i++) {

        let itemCount = null;
        let lastModified = null;
        let answeredQuestions = [];
        let percentCorrect = null;
        let correct = 0;
        let incorrect = 0;
        let noResponse = 0;
        let score = 0;

        if (observation.doc['items'][i]) {
          itemCount = observation.doc['items'][i].inputs.length
          let metadata = observation.doc['items'][i].metadata;
          if (metadata) {
            lastModified = metadata['lastModified']
          }
          // populate answeredQuestions array
          observation.doc['items'][i].inputs.forEach(item => {
            // inputs = [...inputs, ...item.value]
            if (item.value !== "") {
              let data = {}
              data[item.name] = item.value;
              answeredQuestions.push(data)
              if (item.name === curriculumFormsList[i]['id'] + "_score") {
                score = item.value
              }
            }
          })
          // loop through answeredQuestions and calculate correct, incorrect, and missing.
        //   if (curriculumFormsList[i]['prototype'] === 'grid') {
        //
        //   }  else {
        //     for (const answer of answeredQuestions) {
        //       let values = Object.values(answer)
        //       if (typeof values !== 'undefined') {
        //         for (const value of values) {
        //           if (value['tagName'] === 'TANGY-RADIO-BUTTON') {
        //             if (value['label'] === 'Correct' && value['value'] === 'on') {
        //               correct++
        //             } else if (value['label'] === 'Incorrect' && value['value'] === 'on') {
        //               incorrect++
        //             } else if (value['label'] === '>No response' && value['value'] === 'on') {
        //               noResponse++
        //             }
        //           }
        //         }
        //       }
        //     }
        //   }
        //   if (answeredQuestions.length > 0) {
        //     percentCorrect =  Math.round((answeredQuestions.length/itemCount) * 100)
        //   } else {
        //     percentCorrect = 0
        //   }
        }

        let response = {
          formTitle: curriculumFormsList[i]['title'],
          formId: curriculumFormsList[i]['id'],
          prototype: curriculumFormsList[i]['prototype'],
          startDatetime: observation.doc.startDatetime,
          formIndex: i,
          _id: observation.doc._id,
          itemCount: itemCount,
          studentId: observation.doc.metadata.studentRegistrationDoc.id,
          lastModified: lastModified,
          answeredQuestions: answeredQuestions,
          percentCorrect: percentCorrect,
          correct: correct,
          incorrect: incorrect,
          noResponse: noResponse,
          score: score
          // columns
        };

        // return response;
        observations.push(response)
        // }
      }
    });
    // });
    // return Promise.all(observations);
    return observations;
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

