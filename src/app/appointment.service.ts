import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Appointment {
  id?: number;
  nome: string;
  data: string;
  horario: string;
  descricao: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = 'http://localhost:8080/appointments';

  constructor(private http: HttpClient) {}

  listar(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.apiUrl);
  }

  criar(appointment: Appointment): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, appointment);
  }

  atualizar(id: number, appointment: Appointment): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/${id}`, appointment);
  }

  deletar(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}