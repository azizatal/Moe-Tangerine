import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SearchRoutingModule } from './search-routing.module';
import { SearchComponent } from './search.component';
import { SearchBarcodeComponent } from './search-barcode/search-barcode.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  exports: [SearchComponent],
  declarations: [SearchComponent, SearchBarcodeComponent],
  imports: [
    CommonModule,
    SearchRoutingModule,
    TranslateModule
  ]
})
export class SearchModule { }
