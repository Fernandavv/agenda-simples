import { Component, OnInit, signal, NgZone, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

type StatusAgendamento = 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO';
type FiltroStatus = 'TODOS' | StatusAgendamento;

type Agendamento = {
  id?: number;
  nome: string;
  data: string;
  horario: string;
  descricao: string;
  status: StatusAgendamento;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  readonly API_URL = 'https://agendamento-cskh.onrender.com/appointments';

  lista = signal<Agendamento[]>([]);
  salvando = signal(false);
  excluindo = signal(false);
  editandoId = signal<number | null>(null);
  mensagemErro = signal('');
  filtroStatus = signal<FiltroStatus>('TODOS');

  listaFiltrada = computed(() => {
    const filtro = this.filtroStatus();
    const itens = this.lista();

    if (filtro === 'TODOS') {
      return itens;
    }

    return itens.filter(item => item.status === filtro);
  });

  constructor(private zone: NgZone) {}

  ngOnInit(): void {
    this.carregar();
  }

  async carregar(): Promise<void> {
    try {
      const resposta = await fetch(this.API_URL);
      const dados = await resposta.json();

      const normalizados: Agendamento[] = dados.map((item: any) => ({
        id: item.id,
        nome: item.nome ?? '',
        data: item.data ?? '',
        horario: item.horario ?? '',
        descricao: item.descricao ?? '',
        status: (item.status ?? 'AGENDADO') as StatusAgendamento
      }));

      const ordenados = normalizados.sort((a, b) => {
        const dataA = new Date(`${a.data}T${a.horario}`).getTime();
        const dataB = new Date(`${b.data}T${b.horario}`).getTime();
        return dataA - dataB;
      });

      this.zone.run(() => {
        this.lista.set(ordenados);
      });
    } catch (erro) {
      console.error('Erro ao carregar:', erro);
    }
  }

  definirFiltro(status: FiltroStatus): void {
    this.filtroStatus.set(status);
  }

  async salvar(
    nomeInput: HTMLInputElement,
    dataInput: HTMLInputElement,
    horaInput: HTMLInputElement,
    descricaoInput: HTMLTextAreaElement
  ): Promise<void> {
    const nome = nomeInput.value.trim();
    const data = dataInput.value;
    const horario = horaInput.value;
    const descricao = descricaoInput.value.trim();
    const idEmEdicao = this.editandoId();

    if (this.salvando()) return;

    if (!nome && !data && !horario) {
      this.zone.run(() => {
        this.mensagemErro.set('Preencha o nome, a data e a hora.');
      });
      return;
    }

    if (!nome) {
      this.zone.run(() => {
        this.mensagemErro.set('Preencha o nome da pessoa.');
      });
      return;
    }

    if (!data) {
      this.zone.run(() => {
        this.mensagemErro.set('Preencha a data do agendamento.');
      });
      return;
    }

    if (!horario) {
      this.zone.run(() => {
        this.mensagemErro.set('Preencha a hora do agendamento.');
      });
      return;
    }

    this.zone.run(() => {
      this.salvando.set(true);
      this.mensagemErro.set('');
    });

    const statusAtual = idEmEdicao !== null
      ? this.lista().find(item => item.id === idEmEdicao)?.status ?? 'AGENDADO'
      : 'AGENDADO';

    const payload: Agendamento = {
      nome,
      data,
      horario,
      descricao,
      status: statusAtual
    };

    const url =
      idEmEdicao !== null
        ? `${this.API_URL}/${idEmEdicao}`
        : this.API_URL;

    const method = idEmEdicao !== null ? 'PUT' : 'POST';

    try {
      const resposta = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!resposta.ok) {
        throw new Error(`Erro HTTP ${resposta.status}`);
      }

      await this.carregar();

      this.zone.run(() => {
        nomeInput.value = '';
        dataInput.value = '';
        horaInput.value = '';
        descricaoInput.value = '';
        this.editandoId.set(null);
        this.salvando.set(false);
        this.mensagemErro.set('');
      });
    } catch (erro) {
      console.error('Erro ao salvar:', erro);

      this.zone.run(() => {
        this.salvando.set(false);
        this.mensagemErro.set('Não foi possível salvar o agendamento.');
      });
    }
  }

  iniciarEdicao(
    item: Agendamento,
    nomeInput: HTMLInputElement,
    dataInput: HTMLInputElement,
    horaInput: HTMLInputElement,
    descricaoInput: HTMLTextAreaElement
  ): void {
    nomeInput.value = item.nome ?? '';
    dataInput.value = item.data ?? '';
    horaInput.value = item.horario ?? '';
    descricaoInput.value = item.descricao ?? '';

    this.zone.run(() => {
      this.editandoId.set(item.id ?? null);
      this.mensagemErro.set('');
    });
  }

  cancelarEdicao(
    nomeInput: HTMLInputElement,
    dataInput: HTMLInputElement,
    horaInput: HTMLInputElement,
    descricaoInput: HTMLTextAreaElement
  ): void {
    nomeInput.value = '';
    dataInput.value = '';
    horaInput.value = '';
    descricaoInput.value = '';

    this.zone.run(() => {
      this.editandoId.set(null);
      this.mensagemErro.set('');
    });
  }

  async excluir(id?: number): Promise<void> {
    if (!id || this.excluindo()) return;

    this.zone.run(() => {
      this.excluindo.set(true);
    });

    try {
      const resposta = await fetch(`${this.API_URL}/${id}`, {
        method: 'DELETE'
      });

      if (!resposta.ok) {
        throw new Error(`Erro HTTP ${resposta.status}`);
      }

      await this.carregar();

      this.zone.run(() => {
        if (this.editandoId() === id) {
          this.editandoId.set(null);
        }
        this.excluindo.set(false);
      });
    } catch (erro) {
      console.error('Erro ao excluir:', erro);

      this.zone.run(() => {
        this.excluindo.set(false);
      });
    }
  }

  async alterarStatus(item: Agendamento, novoStatus: StatusAgendamento): Promise<void> {
    const payload: Agendamento = {
      id: item.id,
      nome: item.nome,
      data: item.data,
      horario: item.horario,
      descricao: item.descricao,
      status: novoStatus
    };

    try {
      const resposta = await fetch(`${this.API_URL}/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!resposta.ok) {
        throw new Error(`Erro HTTP ${resposta.status}`);
      }

      await this.carregar();
    } catch (erro) {
      console.error('Erro ao alterar status:', erro);
    }
  }

  proximoAgendamento(): Agendamento | null {
    const agora = new Date().getTime();

    const futuros = this.lista()
      .filter(item => {
        const dataItem = new Date(`${item.data}T${item.horario}`).getTime();
        return dataItem >= agora && item.status === 'AGENDADO';
      })
      .sort((a, b) => {
        const dataA = new Date(`${a.data}T${a.horario}`).getTime();
        const dataB = new Date(`${b.data}T${b.horario}`).getTime();
        return dataA - dataB;
      });

    return futuros.length > 0 ? futuros[0] : null;
  }

  formatarDataHoraBR(data: string, horario: string): string {
    if (!data && !horario) return '';

    const [ano, mes, dia] = data.split('-');
    if (!ano || !mes || !dia) {
      return `${data ?? ''} ${horario ?? ''}`.trim();
    }

    return `${dia}/${mes}/${ano} às ${horario}`;
  }
}