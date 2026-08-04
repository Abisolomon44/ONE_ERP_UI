import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MasterRow } from '../master.model';
import { LucideAngularModule } from "lucide-angular";
export interface DropdownOption {
  value: any;
  label: string;
}

export interface MasterColumn {
  field: string;
  header: string;
  width?: string;
  type?: 'text' | 'number' | 'date' | 'currency' | 'checkbox' | 'badge';
}

export interface MasterField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'textarea'
    | 'dropdown'
    | 'checkbox'
    | 'date'
    | 'email'
    | 'password';

  placeholder?: string;

  required?: boolean;

  readonly?: boolean;

  disabled?: boolean;

  minLength?: number;

  maxLength?: number;

  options?: DropdownOption[];
}

export interface MasterTab {

  name: string;

  fields: string[];

}

export interface MasterStat {

  label: string;

  value: number;

  icon: string;

  description?: string;

}

export interface MasterConfig {

  title: string;

  description?: string;

  icon: string;

  api: string;

  permissionName?: string;

  createLabel?: string;

  columns: MasterColumn[];

  fields: MasterField[];

  tabs: MasterTab[];

  stats?: MasterStat[];

  allowCreate?: boolean;

  allowEdit?: boolean;

  allowDelete?: boolean;

  allowImport?: boolean;

  allowExport?: boolean;

  allowRefresh?: boolean;

}

@Component({
  selector: 'app-master-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
],
  templateUrl: './master-page.html',
  styleUrl: './master-page.css'
})
export class MasterPage implements OnInit {

  //===========================
  // Inputs
  //===========================

  @Input({ required: true })
  config!: MasterConfig;
@Input()
data: MasterRow[] = [];
  @Input()
  userModel: Record<string, any> = {};

  @Input()
  loading = false;

  @Input()
  showEntry = false;

  //===========================
  // Outputs
  //===========================

  @Output()
  createClick = new EventEmitter<void>();

  @Output()
  editClick = new EventEmitter<Record<string, any>>();

  @Output()
  deleteClick = new EventEmitter<Record<string, any>>();

  @Output()
  saveClick = new EventEmitter<void>();

  @Output()
  cancelClick = new EventEmitter<void>();

  @Output()
  refreshClick = new EventEmitter<void>();

  //===========================
  // Variables
  //===========================

  searchText = '';

  activeTab = '';

  currentPage = 1;

  pageSize = 10;

  pageSizes = [10,25,50,100];

  //===========================
  // Init
  //===========================

  ngOnInit(): void {

    if(this.config.tabs.length){

      this.activeTab=this.config.tabs[0].name;

    }

  }

  //===========================
  // Search
  //===========================

  get filteredData(){

    if(!this.searchText){

      return this.data;

    }

    const keyword=this.searchText.toLowerCase();

    return this.data.filter(x=>

      JSON.stringify(x)

      .toLowerCase()

      .includes(keyword)

    );

  }

  //===========================
  // Pagination
  //===========================

  get paginatedData(){

    const start=(this.currentPage-1)*this.pageSize;

    return this.filteredData.slice(start,start+this.pageSize);

  }

  get totalPages(){

    return Math.ceil(

      this.filteredData.length/

      this.pageSize

    );

  }

  previousPage(){

    if(this.currentPage>1){

      this.currentPage--;

    }

  }

  nextPage(){

    if(this.currentPage<this.totalPages){

      this.currentPage++;

    }

  }

  pageSizeChanged(){

    this.currentPage=1;

  }

  //===========================
  // Toolbar
  //===========================

  create(){

    this.createClick.emit();

  }

  edit(row:Record<string,any>){

    this.editClick.emit(row);

  }

  delete(row:Record<string,any>){

    this.deleteClick.emit(row);

  }

  save(){

    this.saveClick.emit();

  }

  cancel(){

    this.cancelClick.emit();

  }

  refresh(){

    this.refreshClick.emit();

  }

  //===========================
  // Tabs
  //===========================

  setTab(tab:string){

    this.activeTab=tab;

  }

  get currentTab(){

    return this.config.tabs.find(

      x=>x.name===this.activeTab

    );

  }

  get currentTabFields(){

    if(!this.currentTab){

      return [];

    }

    return this.config.fields.filter(field=>

      this.currentTab!.fields.includes(field.name)

    );

  }

  //===========================
  // Helpers
  //===========================

  get hasData(){

    return this.filteredData.length>0;

  }

  get isEmpty(){

    return !this.loading &&

           this.filteredData.length===0;

  }

}