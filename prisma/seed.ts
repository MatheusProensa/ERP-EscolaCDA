import { PrismaClient, Turno } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ANO = 2026;

// Tarde = ensino regular, em ordem de progressão. Manhã = contraturno (atividades
// complementares); alunos do contraturno costumam ter também uma matrícula regular à tarde.
const TURMAS_SEED = [
  { nome: "Berçário I", turno: Turno.TARDE, capacidade: 15 },
  { nome: "Berçário II", turno: Turno.TARDE, capacidade: 15 },
  { nome: "Maternal I", turno: Turno.TARDE, capacidade: 20 },
  { nome: "Maternal II", turno: Turno.TARDE, capacidade: 20 },
  { nome: "Pré-escola I", turno: Turno.TARDE, capacidade: 25 },
  { nome: "Pré-escola II", turno: Turno.TARDE, capacidade: 25 },
  { nome: "1º Ano", turno: Turno.TARDE, capacidade: 30 },
  { nome: "2º Ano", turno: Turno.TARDE, capacidade: 30 },
  { nome: "3º Ano", turno: Turno.TARDE, capacidade: 30 },
  { nome: "Contraturno I", turno: Turno.MANHA, capacidade: 25 },
  { nome: "Contraturno II", turno: Turno.MANHA, capacidade: 25 },
  { nome: "Contraturno III", turno: Turno.MANHA, capacidade: 25 },
  { nome: "Contraturno IV", turno: Turno.MANHA, capacidade: 25 },
  { nome: "Contraturno V", turno: Turno.MANHA, capacidade: 25 },
];

// Valor de mensalidade por turma. Creches costumam custar mais que o fundamental por
// causa da proporção cuidador/criança; contraturno é uma cobrança à parte, mais baixa.
const VALOR_MENSALIDADE: Record<string, number> = {
  "Berçário I": 650,
  "Berçário II": 620,
  "Maternal I": 580,
  "Maternal II": 550,
  "Pré-escola I": 520,
  "Pré-escola II": 500,
  "1º Ano": 480,
  "2º Ano": 480,
  "3º Ano": 480,
  "Contraturno I": 280,
  "Contraturno II": 280,
  "Contraturno III": 280,
  "Contraturno IV": 280,
  "Contraturno V": 280,
};

const CODIGO_TURMA: Record<string, string> = {
  BI: "Berçário I",
  BII: "Berçário II",
  MI: "Maternal I",
  MII: "Maternal II",
  PREI: "Pré-escola I",
  PREII: "Pré-escola II",
  "1ANO": "1º Ano",
  "2ANO": "2º Ano",
  "3ANO": "3º Ano",
  CTI: "Contraturno I",
  CTII: "Contraturno II",
};

// Alunos reais, extraídos do calendário de aniversariantes 2026 da Escola CDA (nome,
// data de nascimento e turma). Alguns alunos têm duas matrículas: ensino regular à
// tarde + contraturno pela manhã.
const ALUNOS_REAIS: { nome: string; nascimento: string; turmas: (keyof typeof CODIGO_TURMA)[] }[] = [
  // Janeiro
  { nome: "Alice Silveira Millani", nascimento: "2018-01-03", turmas: ["3ANO"] },
  { nome: "Rafaela Silveira Millani", nascimento: "2018-01-03", turmas: ["3ANO"] },
  { nome: "Antonia Leite Badke Trindade", nascimento: "2018-01-10", turmas: ["3ANO"] },
  { nome: "Luísa Puchale Bressa", nascimento: "2023-01-10", turmas: ["MII"] },
  { nome: "Alice Borges Moro", nascimento: "2018-01-13", turmas: ["3ANO"] },
  { nome: "Benício Rodrigues Aires", nascimento: "2022-01-17", turmas: ["PREI"] },
  { nome: "Allan Souza Carvalho", nascimento: "2024-01-19", turmas: ["MI"] },
  { nome: "Alice Loures Lazzari", nascimento: "2018-01-20", turmas: ["3ANO"] },
  { nome: "Maythê Mehy Santos Silva", nascimento: "2020-01-25", turmas: ["1ANO"] },
  { nome: "Camillo Tolotti Vargas", nascimento: "2020-01-26", turmas: ["1ANO"] },
  { nome: "Marina Sabino Ineu", nascimento: "2025-01-26", turmas: ["BII"] },
  { nome: "Theodoro Böhmer Pothin", nascimento: "2018-01-29", turmas: ["3ANO"] },
  // Fevereiro
  { nome: "Mathias Pippi Wentzel", nascimento: "2024-02-06", turmas: ["MI"] },
  { nome: "Isabela Morcelli Alves", nascimento: "2025-02-08", turmas: ["BII"] },
  { nome: "Matteo Tolotti Vargas", nascimento: "2023-02-11", turmas: ["MII"] },
  { nome: "Arthur Magalhães Lippert", nascimento: "2019-02-14", turmas: ["2ANO"] },
  { nome: "Veronica Rossato Lima", nascimento: "2023-02-21", turmas: ["MII"] },
  { nome: "Aurora Balbinot Azzi", nascimento: "2023-02-25", turmas: ["CTII"] },
  { nome: "Laís Colpo", nascimento: "2026-02-26", turmas: ["BI"] },
  { nome: "Luísa Colpo", nascimento: "2026-02-26", turmas: ["BI"] },
  // Março
  { nome: "Théo Savegnago Cherobini", nascimento: "2019-03-01", turmas: ["2ANO"] },
  { nome: "Laura Bento Martel", nascimento: "2025-03-01", turmas: ["CTI"] },
  { nome: "Luara Minuzzi Marin", nascimento: "2021-03-07", turmas: ["PREII"] },
  { nome: "Valentina Badke Negrini", nascimento: "2022-03-09", turmas: ["PREI"] },
  { nome: "Luana Wonsick Dall'Agnol", nascimento: "2025-03-09", turmas: ["BII"] },
  { nome: "Luca Batista Querino", nascimento: "2025-03-09", turmas: ["BII"] },
  { nome: "Antonella Tonetto Bertagnoll", nascimento: "2022-03-10", turmas: ["PREI"] },
  { nome: "Elisa Hernandez Arboleda", nascimento: "2022-03-13", turmas: ["PREI"] },
  { nome: "Miguel Pinaffo Fidelis", nascimento: "2024-03-21", turmas: ["MI"] },
  { nome: "Júlia Maffini Bortoluzzi", nascimento: "2019-03-27", turmas: ["2ANO"] },
  { nome: "Vicente Pozebon Trauer", nascimento: "2018-03-28", turmas: ["3ANO"] },
  // Abril
  { nome: "Joaquim Farencena Sarturi", nascimento: "2019-04-13", turmas: ["1ANO"] },
  { nome: "Gabriel Stangherlin Marchesan", nascimento: "2020-04-14", turmas: ["PREII"] },
  { nome: "Lucas Alves Fiorin", nascimento: "2020-04-15", turmas: ["PREII"] },
  { nome: "Mercedita Janke Salgado", nascimento: "2021-04-17", turmas: ["PREI"] },
  { nome: "Elisa Prade Limana", nascimento: "2020-04-20", turmas: ["PREII"] },
  { nome: "Marco Antônio Raddatz Perlin", nascimento: "2022-04-28", turmas: ["MII"] },
  // Maio
  { nome: "Alice Nascimento da Rocha", nascimento: "2017-05-05", turmas: ["3ANO"] },
  { nome: "Matheus Borges Moro", nascimento: "2020-05-07", turmas: ["PREII"] },
  { nome: "Elisa de Fátima Gomes Camargo", nascimento: "2021-05-13", turmas: ["PREI"] },
  { nome: "Otto Pohl Bredow", nascimento: "2020-05-15", turmas: ["PREII"] },
  { nome: "Pedro Antônio Caetano da Silva Corcini", nascimento: "2023-05-20", turmas: ["MI"] },
  // Junho
  { nome: "Estela Negrini Carloto", nascimento: "2022-06-01", turmas: ["MII"] },
  { nome: "Luiza Lopes Kemel", nascimento: "2017-06-01", turmas: ["3ANO"] },
  { nome: "Bento Bertolin da Silveira", nascimento: "2023-06-02", turmas: ["CTII"] },
  { nome: "Olívia Avelar Tarouco", nascimento: "2025-06-03", turmas: ["BI"] },
  { nome: "Martín Aires Giacomeli", nascimento: "2023-06-20", turmas: ["MI"] },
  { nome: "Joaquim Inácio Benini Bragagnolo", nascimento: "2023-06-22", turmas: ["CTII"] },
  { nome: "Miguel Pereira Machado", nascimento: "2023-06-26", turmas: ["MI"] },
  { nome: "Maria Helena Alberton de Lima", nascimento: "2022-06-30", turmas: ["CTII"] },
  // Julho
  { nome: "Davi Loures Lazzari", nascimento: "2020-07-02", turmas: ["PREII"] },
  { nome: "Ana Beatriz de Brito Pedrosa", nascimento: "2017-07-08", turmas: ["3ANO"] },
  { nome: "Eduardo Alves Fiorin", nascimento: "2023-07-10", turmas: ["MI"] },
  { nome: "Joaquim Della Flora Carrillo", nascimento: "2024-07-10", turmas: ["BII"] },
  { nome: "Melissa Pinaffo Fidelis", nascimento: "2021-07-11", turmas: ["PREI"] },
  { nome: "Matteo Puchale Bressa", nascimento: "2024-07-11", turmas: ["BII"] },
  { nome: "Milena Raddatz Perlin", nascimento: "2018-07-17", turmas: ["2ANO"] },
  { nome: "Elisa Fighera Cargnelutti", nascimento: "2020-07-22", turmas: ["PREII"] },
  { nome: "Enrico Costa Quispe", nascimento: "2018-07-25", turmas: ["2ANO"] },
  { nome: "Bernardo Uhlmann Thewes", nascimento: "2025-07-27", turmas: ["BI"] },
  // Agosto
  { nome: "Rafael Costa Fagundes de Oliveira", nascimento: "2021-08-02", turmas: ["PREI"] },
  { nome: "Mateus Martin de Macedo", nascimento: "2025-08-16", turmas: ["BI"] },
  { nome: "Rafael do Carmo Hunhoff", nascimento: "2022-08-30", turmas: ["MII"] },
  // Setembro
  { nome: "Davi Menezes Gass", nascimento: "2019-09-03", turmas: ["1ANO"] },
  { nome: "Théo Souza Munhoz", nascimento: "2022-09-03", turmas: ["MII"] },
  { nome: "Martin Hister de Macedo", nascimento: "2020-09-10", turmas: ["PREII"] },
  { nome: "Alisson Reisdorfer Macedo", nascimento: "2021-09-15", turmas: ["PREI"] },
  { nome: "Mathias Lagomarsino Beux", nascimento: "2021-09-21", turmas: ["PREI"] },
  { nome: "Luisa dos Santos Pacheco", nascimento: "2022-09-21", turmas: ["CTII"] },
  { nome: "Maria Antônia Machado Wallau", nascimento: "2023-09-25", turmas: ["CTII"] },
  { nome: "Helena Fátima Cossetin Rosso", nascimento: "2024-09-30", turmas: ["BII"] },
  // Outubro
  { nome: "Fernando Soares Oliveira Krug", nascimento: "2021-10-04", turmas: ["PREI"] },
  { nome: "Maria Manoela Souza Papalia", nascimento: "2020-10-07", turmas: ["PREII"] },
  { nome: "Laura Luisa Friedrich", nascimento: "2018-10-15", turmas: ["2ANO"] },
  { nome: "Helena Rossetto Bortolotto", nascimento: "2025-10-15", turmas: ["CTI"] },
  { nome: "Arthur Antônio Dias Gomes", nascimento: "2023-10-19", turmas: ["CTII"] },
  { nome: "Murilo Vargas Forgiarini", nascimento: "2024-10-19", turmas: ["BII"] },
  { nome: "Aurora Cavalheiro Penteado", nascimento: "2022-10-21", turmas: ["MII"] },
  { nome: "Luca Alberton de Lima", nascimento: "2024-10-22", turmas: ["CTI"] },
  { nome: "Bernardo Mascarenhas da Silva", nascimento: "2018-10-22", turmas: ["2ANO"] },
  { nome: "Ornella da Conceição Carvalho", nascimento: "2020-10-26", turmas: ["PREII"] },
  { nome: "Mariah Ramos Busanello", nascimento: "2019-10-31", turmas: ["1ANO"] },
  // Novembro
  { nome: "Isabela Neujahr Ceolin", nascimento: "2017-11-09", turmas: ["3ANO"] },
  { nome: "Giovanna Zambon Zimermann", nascimento: "2018-11-23", turmas: ["2ANO"] },
  // Dezembro
  { nome: "Théo Muller Eloi", nascimento: "2021-12-03", turmas: ["PREI"] },
  { nome: "Livia Sabino Ineu", nascimento: "2020-12-05", turmas: ["PREII"] },
  { nome: "Martin Menegon Pinheiro", nascimento: "2025-12-10", turmas: ["BI", "CTI"] },
  { nome: "Isis Plentz Alves", nascimento: "2023-12-11", turmas: ["MI"] },
  { nome: "Helena Tonetto Bertagnolli", nascimento: "2023-12-13", turmas: ["MI"] },
  { nome: "Melissa Trindade Kemerich", nascimento: "2023-12-18", turmas: ["MI"] },
  { nome: "Maria Luísa Schmidt Calegari", nascimento: "2019-12-19", turmas: ["1ANO"] },
  { nome: "Arthur da Silveira Frank", nascimento: "2019-12-22", turmas: ["1ANO"] },
  { nome: "Maria Cecília Granzotto de Oliveira", nascimento: "2022-12-27", turmas: ["MII"] },
  { nome: "Gonçalo Nascimento Tomazetti Balconi", nascimento: "2018-12-28", turmas: ["2ANO"] },
  { nome: "Kauã Cirolini Cardoso", nascimento: "2021-12-28", turmas: ["PREI"] },
  { nome: "Samuel da Rosa de Souza", nascimento: "2020-12-29", turmas: ["PREII"] },
  { nome: "Augusto Flores Prado", nascimento: "2023-12-31", turmas: ["MI"] },
];

// Equipe real da Escola CDA, cruzando as figurinhas da Copa 2026 com o calendário de
// aniversariantes (que trouxe sobrenomes e cargos mais específicos). "Gabriela" são
// duas pessoas distintas (Vieira Schramm e Oliveira) - corrigido depois de um merge
// indevido na primeira versão do seed.
const NOMES_FUNCIONARIOS = [
  { nome: "Carla Guntzel", cargo: "Diretora", setor: "Direção" },
  { nome: "Letícia Proensa", cargo: "Diretora", setor: "Direção" },
  { nome: "Priscila Proensa", cargo: "Coordenadora Pedagógica", setor: "Coordenação" },
  { nome: "Eduarda Rodrigues Sturm", cargo: "Secretária", setor: "Secretaria" },
  { nome: "Maria Eduarda Güntzel de Freitas", cargo: "Secretária", setor: "Secretaria" },
  { nome: "Eduarda Jaymes", cargo: "Estagiária", setor: "Pedagógico" },
  { nome: "Itamar", cargo: "Financeiro", setor: "Financeiro" },
  { nome: "Matheus", cargo: "Filmmaker", setor: "Marketing" },
  { nome: "Camila", cargo: "Professora de Educação Física", setor: "Pedagógico" },
  { nome: "Antonio Stona", cargo: "Professor de Inglês (Educação Infantil)", setor: "Pedagógico" },
  { nome: "Gabriela Vieira Schramm", cargo: "Teacher", setor: "Pedagógico" },
  { nome: "Gabriela Oliveira", cargo: "Professora - 3º Ano", setor: "Pedagógico" },
  { nome: "Rodrigo", cargo: "Professor de Capoeira", setor: "Pedagógico" },
  { nome: "Diogo", cargo: "Professor de Música", setor: "Pedagógico" },
  { nome: "Lidiane Tadiello", cargo: "Professora - Maternal I", setor: "Pedagógico" },
  { nome: "Jéssica Gelocha", cargo: "Professora - 1º Ano", setor: "Pedagógico" },
  { nome: "Carolina Silveira Rodrigues", cargo: "Professora - Berçário II", setor: "Pedagógico" },
  { nome: "Mariana de Souza Carames", cargo: "Professora - Pré-escola I", setor: "Pedagógico" },
  { nome: "Cláudia Jaqueline Machado", cargo: "Professora - 2º Ano", setor: "Pedagógico" },
  { nome: "Taís Canfild Veiga Trindade", cargo: "Professora - Berçário I", setor: "Pedagógico" },
  { nome: "Geovana Jacobsen Vargas", cargo: "Professora - Pré-escola II", setor: "Pedagógico" },
  { nome: "Melissa Santos", cargo: "Educadora Especial / Professora de Libras", setor: "Pedagógico" },
  { nome: "Natália", cargo: "Nutricionista", setor: "Nutrição" },
  { nome: "Natalia Bolson da Silva", cargo: "Monitora", setor: "Pedagógico" },
  { nome: "Sheron Quinto Togni", cargo: "Monitora", setor: "Pedagógico" },
  { nome: "Débora", cargo: "Monitora", setor: "Pedagógico" },
  { nome: "Vitória Silva de Abreu", cargo: "Monitora", setor: "Pedagógico" },
  { nome: "Edinéia Oliveira Silva", cargo: "Monitora", setor: "Pedagógico" },
  { nome: "Suelen Guedes", cargo: "Monitora", setor: "Pedagógico" },
  { nome: "Andressa Naibert", cargo: "Monitora", setor: "Pedagógico" },
  { nome: "Caroline Padilha Santana", cargo: "Monitora", setor: "Pedagógico" },
  { nome: "Amanda", cargo: "Monitora", setor: "Pedagógico" },
  { nome: "Jéssica Doyle Dias", cargo: "Cozinheira", setor: "Cozinha" },
  { nome: "Delma Therezinha Rodrigues Bittencourt", cargo: "Serviços Gerais", setor: "Serviços Gerais" },
  { nome: "Vanderleia", cargo: "Serviços Gerais", setor: "Serviços Gerais" },
];

function aleatorio<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

function gerarCPF(seed: number): string {
  const n = String(10000000000 + seed * 7919).slice(0, 11);
  return n;
}

function gerarTelefone(seed: number): string {
  const numero = 90000000 + ((seed * 37) % 9999999);
  return `559${numero}`;
}

// Sexo inferido pelo primeiro nome (dado não coletado no PDF de aniversariantes).
const SEXO_POR_PRIMEIRO_NOME: Record<string, "M" | "F"> = {
  Alice: "F", Rafaela: "F", Antonia: "F", Luísa: "F", Benício: "M", Allan: "M", Maythê: "F",
  Camillo: "M", Marina: "F", Theodoro: "M", Mathias: "M", Isabela: "F", Matteo: "M", Arthur: "M",
  Veronica: "F", Aurora: "F", Laís: "F", Théo: "M", Laura: "F", Luara: "F", Valentina: "F",
  Luana: "F", Luca: "M", Antonella: "F", Elisa: "F", Miguel: "M", Júlia: "F", Vicente: "M",
  Joaquim: "M", Gabriel: "M", Lucas: "M", Mercedita: "F", Marco: "M", Matheus: "M", Otto: "M",
  Pedro: "M", Estela: "F", Luiza: "F", Bento: "M", Olívia: "F", Martín: "M", Maria: "F",
  Davi: "M", Ana: "F", Eduardo: "M", Melissa: "F", Milena: "F", Enrico: "M", Bernardo: "M",
  Rafael: "M", Mateus: "M", Martin: "M", Alisson: "M", Luisa: "F", Fernando: "M", Helena: "F",
  Murilo: "M", Ornella: "F", Mariah: "F", Giovanna: "F", Livia: "F", Isis: "F", Gonçalo: "M",
  Kauã: "M", Samuel: "M", Augusto: "M",
};

function inferirSexo(nomeCompleto: string): "M" | "F" {
  return SEXO_POR_PRIMEIRO_NOME[nomeCompleto.split(" ")[0]] ?? "F";
}

function sortearRacaCor(): "BRANCA" | "PRETA" | "PARDA" | "AMARELA" | "INDIGENA" | "NAO_DECLARADA" {
  const r = Math.random();
  if (r < 0.68) return "BRANCA";
  if (r < 0.86) return "PARDA";
  if (r < 0.94) return "PRETA";
  if (r < 0.97) return "AMARELA";
  if (r < 0.99) return "INDIGENA";
  return "NAO_DECLARADA";
}

async function main() {
  console.log("Limpando dados existentes...");
  await prisma.logAtividade.deleteMany();
  await prisma.nota.deleteMany();
  await prisma.disciplina.deleteMany();
  await prisma.pagamento.deleteMany();
  await prisma.mensalidade.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.matricula.deleteMany();
  await prisma.responsavel.deleteMany();
  await prisma.aluno.deleteMany();
  await prisma.turma.deleteMany();
  await prisma.anoLetivo.deleteMany();
  await prisma.funcionario.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.itemEstoque.deleteMany();
  await prisma.muralAviso.deleteMany();
  await prisma.emprestimoChave.deleteMany();
  await prisma.chave.deleteMany();
  await prisma.cardapio.deleteMany();
  await prisma.user.deleteMany();

  console.log("Criando usuários...");
  const senhaHash = await bcrypt.hash("cda123456", 10);
  await prisma.user.createMany({
    data: [
      { name: "Administrador CDA", email: "admin@escolacda.com.br", password: senhaHash, role: "ADMIN" },
      { name: "Direção CDA", email: "direcao@escolacda.com.br", password: senhaHash, role: "DIRECAO" },
      { name: "Secretaria CDA", email: "secretaria@escolacda.com.br", password: senhaHash, role: "SECRETARIA" },
    ],
  });

  console.log("Criando ano letivo...");
  const anoLetivo = await prisma.anoLetivo.create({
    data: { ano: ANO, ativo: true },
  });

  console.log("Criando turmas...");
  const turmasPorNome = new Map<string, Awaited<ReturnType<typeof prisma.turma.create>>>();
  for (const t of TURMAS_SEED) {
    const turma = await prisma.turma.create({
      data: {
        nome: t.nome,
        turno: t.turno,
        capacidade: t.capacidade,
        anoLetivoId: anoLetivo.id,
      },
    });
    turmasPorNome.set(t.nome, turma);
  }

  console.log("Criando alunos, responsáveis e matrículas...");
  const logs: { acao: string; entidade: string; entidadeId: string; usuario: string }[] = [];

  for (let i = 0; i < ALUNOS_REAIS.length; i++) {
    const { nome, nascimento, turmas: codigosTurma } = ALUNOS_REAIS[i];

    const sobrenome = nome.split(" ").slice(-1)[0];
    const nomeMae = `${aleatorio(["Maria", "Ana", "Rosa", "Fernanda", "Cristina", "Patrícia", "Simone", "Adriana"])} ${sobrenome}`;
    const nomePai = `${aleatorio(["José", "Antônio", "Carlos", "Roberto", "Marcelo", "Fabiano", "Rodrigo", "Luiz"])} ${sobrenome}`;
    const parentescoResponsavel = aleatorio(["Mãe", "Pai"] as const);

    const racaCor = sortearRacaCor();
    const bolsaFamilia = Math.random() < 0.15;
    const deficiencia = Math.random() < 0.05;

    const aluno = await prisma.aluno.create({
      data: {
        nome,
        dataNascimento: new Date(nascimento),
        cpf: null,
        alergias: i % 7 === 0 ? "Alergia a amendoim" : null,
        restricoes: i % 9 === 0 ? "Intolerância à lactose" : null,
        endereco: `Rua das Flores, ${100 + i}`,
        bairro: "Centro",
        cidade: "Santa Maria",
        cep: "97010-000",
        sexo: inferirSexo(nome),
        racaCor,
        povoIndigena: racaCor === "INDIGENA" ? aleatorio(["Kaingang", "Guarani"]) : null,
        nacionalidade: "BRASILEIRA",
        municipioNasc: "Santa Maria",
        ufNasc: "RS",
        filiacao1: nomeMae,
        filiacao2: nomePai,
        bolsaFamilia,
        nis: bolsaFamilia ? gerarCPF(5000 + i) : null,
        deficiencia,
        tipoDeficiencia: deficiencia ? "Transtorno do Espectro Autista (TEA)" : null,
        recursosAcessib: deficiencia ? "Apoio de profissional auxiliar em sala e tempo adicional em avaliações." : null,
        responsaveis: {
          create: [
            (() => {
              const nomeResponsavel = parentescoResponsavel === "Mãe" ? nomeMae : nomePai;
              return {
                nome: nomeResponsavel,
                parentesco: parentescoResponsavel,
                telefone: gerarTelefone(i),
                email: `responsavel${i + 1}@exemplo.com`,
                autorizado: true,
              };
            })(),
          ],
        },
      },
    });

    logs.push({ acao: "Matrícula confirmada", entidade: "Aluno", entidadeId: aluno.id, usuario: "Secretaria CDA" });

    for (const codigo of codigosTurma) {
      const nomeTurma = CODIGO_TURMA[codigo];
      const turma = turmasPorNome.get(nomeTurma)!;

      const matricula = await prisma.matricula.create({
        data: {
          alunoId: aluno.id,
          turmaId: turma.id,
          anoLetivoId: anoLetivo.id,
          situacao: "ATIVA",
        },
      });

      // Mensalidades de janeiro a dezembro, sem dados financeiros fictícios:
      // todas ficam PENDENTE até a secretaria registrar pagamentos reais.
      const valor = VALOR_MENSALIDADE[nomeTurma];
      await prisma.mensalidade.createMany({
        data: Array.from({ length: 12 }, (_, i) => ({
          matriculaId: matricula.id,
          mes: i + 1,
          ano: ANO,
          valor,
          vencimento: new Date(ANO, i, 10),
          situacao: "PENDENTE" as const,
        })),
      });
    }
  }

  console.log("Criando funcionários...");
  const emailsUsados = new Set<string>();
  function gerarEmail(nome: string): string {
    const base = nome
      .split(" ")[0]
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z]/g, "");
    let email = `${base}@escolacda.com.br`;
    let sufixo = 2;
    while (emailsUsados.has(email)) {
      email = `${base}${sufixo}@escolacda.com.br`;
      sufixo++;
    }
    emailsUsados.add(email);
    return email;
  }

  for (let i = 0; i < NOMES_FUNCIONARIOS.length; i++) {
    const f = NOMES_FUNCIONARIOS[i];
    await prisma.funcionario.create({
      data: {
        nome: f.nome,
        cpf: gerarCPF(1000 + i),
        cargo: f.cargo,
        setor: f.setor,
        telefone: null,
        email: gerarEmail(f.nome),
        admissao: new Date(ANO - (1 + (i % 5)), i % 12, 1),
        ativo: true,
      },
    });
  }

  console.log("Criando itens de estoque...");
  const itens = [
    { nome: "Papel A4 (resma)", categoria: "Material Escolar", unidade: "resma", quantidade: 40, minimo: 10 },
    { nome: "Giz de cera (caixa)", categoria: "Material Escolar", unidade: "caixa", quantidade: 15, minimo: 5 },
    { nome: "Álcool em gel", categoria: "Limpeza", unidade: "litro", quantidade: 8, minimo: 10 },
    { nome: "Papel toalha", categoria: "Limpeza", unidade: "pacote", quantidade: 3, minimo: 8 },
    { nome: "Cola branca", categoria: "Material Escolar", unidade: "un", quantidade: 25, minimo: 10 },
  ];
  for (const item of itens) {
    const criado = await prisma.itemEstoque.create({ data: item });
    await prisma.movimentacaoEstoque.create({
      data: { itemId: criado.id, tipo: "ENTRADA", quantidade: item.quantidade, motivo: "Estoque inicial" },
    });
  }

  console.log("Criando chaves...");
  await prisma.chave.createMany({
    data: [
      { sala: "Sala 1 - Berçário" },
      { sala: "Sala 2 - Maternal" },
      { sala: "Sala 3 - Pré-escola" },
      { sala: "Laboratório de Informática" },
      { sala: "Sala de Vídeo" },
      { sala: "Pátio Coberto" },
    ],
  });
  const salaVideo = await prisma.chave.findFirst({ where: { sala: "Sala de Vídeo" } });
  if (salaVideo) {
    await prisma.emprestimoChave.create({
      data: { chaveId: salaVideo.id, responsavel: "Rodrigo (Prof. Capoeira)" },
    });
  }

  console.log("Criando cardápio da semana...");
  const hoje = new Date();
  const inicioSemana = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  const diaSemanaAtual = inicioSemana.getUTCDay();
  inicioSemana.setUTCDate(inicioSemana.getUTCDate() + (diaSemanaAtual === 0 ? -6 : 1 - diaSemanaAtual));
  const cardapioSemana = [
    { almoco: "Arroz, feijão, frango grelhado e salada", lanche: "Fruta e biscoito" },
    { almoco: "Macarrão à bolonhesa e legumes no vapor", lanche: "Iogurte e granola" },
    { almoco: "Arroz, feijão, carne moída e purê de batata", lanche: "Suco natural e bolo" },
    { almoco: "Risoto de frango e salada verde", lanche: "Fruta picada" },
    { almoco: "Arroz, feijão, peixe assado e legumes", lanche: "Sanduíche natural" },
  ];
  for (let i = 0; i < cardapioSemana.length; i++) {
    const dia = new Date(inicioSemana);
    dia.setUTCDate(dia.getUTCDate() + i);
    await prisma.cardapio.create({ data: { data: dia, ...cardapioSemana[i] } });
  }

  console.log("Criando avisos do mural...");
  await prisma.muralAviso.createMany({
    data: [
      {
        titulo: "Reunião de pais - 3º Trimestre",
        conteudo: "Reunião de pais e mestres marcada para o dia 25/07, às 19h, no auditório.",
        autor: "Direção CDA",
        fixado: true,
      },
      {
        titulo: "Campanha do agasalho",
        conteudo: "Estamos arrecadando agasalhos até o fim do mês. Ponto de coleta na secretaria.",
        autor: "Secretaria CDA",
        fixado: false,
      },
    ],
  });

  console.log("Criando logs de atividade...");
  await prisma.logAtividade.createMany({ data: logs.slice(-15) });

  console.log("Seed concluído com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
