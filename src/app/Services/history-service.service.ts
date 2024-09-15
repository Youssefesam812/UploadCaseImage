import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HistoryServiceService {
  private DrLoginToken =
    'http://ec2-34-250-251-119.eu-west-1.compute.amazonaws.com/api/Auth/login/doctor';
  private AllAnatomy =
    'http://ec2-34-250-251-119.eu-west-1.compute.amazonaws.com/api/Anatomy/All';
  private PostImagesUpload =
    'http://ec2-34-250-251-119.eu-west-1.compute.amazonaws.com/api/Images/upload';
  private PostPatientCase =
    'http://ec2-34-250-251-119.eu-west-1.compute.amazonaws.com/api/PatientCase/add';
  private GetPatientCase =
    'http://ec2-34-250-251-119.eu-west-1.compute.amazonaws.com/api/PatientCase/GetPatientCase';

  constructor(private http: HttpClient) {}

  GetDrToken(drNum: { phone: string }): Observable<any> {
    return this.http.post(this.DrLoginToken, drNum);
  }

  GetAllAnatomy() : Observable<any>  {
    return this.http.get(this.AllAnatomy)
  }


  PostImagesFunction(data: any): Observable<any> {
    return this.http.post(this.PostImagesUpload, data);
  }

  PostPatientCaseFunction(data: any, token: any): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,  
      'Content-Type': 'application/json' 
    });
  
    return this.http.post(this.PostPatientCase, data, { headers: headers });
  }
  
  getAllCases(pageNumber: number, pageSize: number, anatomyString?: string, dateString?: string | null): Observable<any> {
    let params = new HttpParams();
    if (anatomyString) {
      params = params.append('AnatomyId', anatomyString);
    }
    if (dateString) {
      params = params.append('VisitDate', dateString);
    }
  
    params = params.append('pageNumber', pageNumber.toString());
    params = params.append('pageSize', pageSize.toString());
  
    return this.http.get<any>(`${this.GetPatientCase}`, { params }).pipe(
      catchError((error) => {
        console.error('Error fetching cases:', error);
        return throwError(() => new Error('Error fetching cases'));
      })
    );
  }
  
  
  // filterCases(anatomyString?: string, dateString?: string | null): Observable<any> {
  //   let params = new HttpParams();
  
  //   // Add parameters if they are provided
  //   if (anatomyString) {
  //     params = params.append('AnatomyId', anatomyString);
  //   }
  //   if (dateString) {
  //     params = params.append('VisitDate', dateString);
  //   }
  
  //   return this.http.get<any>(`${this.GetPatientCase}`, { params }).pipe(
  //     catchError((error) => {
  //       console.error('Error fetching cases:', error);
  //       return throwError(() => new Error('Error fetching cases'));
  //     })
  //   );

    
  // }
}
