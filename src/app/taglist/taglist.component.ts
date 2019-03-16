import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'nd-taglist',
  templateUrl: './taglist.component.html',
  styleUrls: ['./taglist.component.less']
})
export class TaglistComponent implements OnInit {

  list = 'yo'

  constructor() { }

  ngOnInit() {
  }

}
