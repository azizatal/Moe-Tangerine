import { _TRANSLATE } from 'src/app/shared/_services/translation-marker';
import { Breadcrumb } from './../../shared/_components/breadcrumb/breadcrumb.component';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ServerConfigService } from 'src/app/shared/_services/server-config.service';
import { UserService } from 'src/app/core/auth/_services/user.service';

@Component({
  selector: 'app-group-author',
  templateUrl: './group-author.component.html',
  styleUrls: ['./group-author.component.css']
})
export class GroupAuthorComponent implements OnInit {

  title = _TRANSLATE('Author')
  breadcrumbs:Array<Breadcrumb> = []
  groupId

  constructor(
    private serverConfig: ServerConfigService,
    private userService:UserService,
    private route: ActivatedRoute
  ) { }

  async ngOnInit() {
    this.breadcrumbs = []
    this.route.params.subscribe(async params => {
      this.groupId = params.groupId;
    });
  }

 }
