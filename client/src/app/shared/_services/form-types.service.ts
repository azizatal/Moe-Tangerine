import { Injectable } from '@angular/core';
import { FormType } from '../_classes/form-type.class';

const FORM_TYPES_INFO:Array<FormType> = [
  <FormType>{
    id: 'form',
    newFormResponseLinkTemplate: '/tangy-forms-player/new/${formId}',
    resumeFormResponseLinkTemplate: '/tangy-forms-player/${response._id}',
    iconTemplate: '${response && response.complete ? `assignment-turned-in` : `assignment`}'
  },
  <FormType>{
    id: 'case',
    newFormResponseLinkTemplate: '/new-case?formId=${formId}',
    resumeFormResponseLinkTemplate: '/case/${response._id}',
    iconTemplate: '${response && response.complete ? `folder-special` : `folder`}'
  }
]

@Injectable({
  providedIn: 'root'
})
export class FormTypesService {

  constructor() { }

  getFormTypes():Array<FormType> {
    return FORM_TYPES_INFO
  }

}
