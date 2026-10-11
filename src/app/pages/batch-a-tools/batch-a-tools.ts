import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({selector:'app-batch-a-tools',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./batch-a-tools.html',styleUrl:'./batch-a-tools.css'})
export class BatchAToolsPage {
  private readonly http=inject(HttpClient); protected variantId=0; protected attributeName=''; protected attributeValue=''; protected attributes=signal<any[]>([]); protected barcode=''; protected barcodeType='CODE128'; protected productName=''; protected labels=signal<any[]>([]);
  async loadAttributes(){if(!this.variantId)return;this.attributes.set(await firstValueFrom(this.http.get<any[]>('/api/product-variant-attributes',{params:{variantId:this.variantId}}))??[]);}
  async addAttribute(){if(!this.variantId||!this.attributeName||!this.attributeValue)return;await firstValueFrom(this.http.post('/api/product-variant-attributes',{variantId:this.variantId,attributeName:this.attributeName,attributeValue:this.attributeValue}));this.attributeName='';this.attributeValue='';await this.loadAttributes();}
  async deleteAttribute(id:number){await firstValueFrom(this.http.delete(`/api/product-variant-attributes/${id}`));await this.loadAttributes();}
  addLabel(){if(this.barcode)this.labels.update(x=>[...x,{barcode:this.barcode,barcodeType:this.barcodeType,productName:this.productName}]);}
  print(){window.print();}
}
