import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})

export class DashboardService {
  url = environment.apiUrl;

  constructor(private httpClient:HttpClient) {
  }

  getDetails() {
    //count of product, category and bills
    return this.httpClient.get(this.url + '/dashboard/details');
  }
}
