import { PrismaClient, Turno, FormaPagamento, DocumentoCategoria, PontoOcorrencia } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ANO = 2026;
const MES_ATUAL = 7; // julho/2026

// ---------------------------------------------------------------------------
// ALUNOS REAIS — extraídos da Planilha_alunos da Escola CDA (Google Drive,
// pasta "Escola CDA"). Cada aluno traz turma, turno, data de nascimento,
// responsável (nome/CPF/e-mail/telefone) e valor de mensalidade reais.
// Não inventamos dado de saúde/censo escolar que a planilha não trazia.
// ---------------------------------------------------------------------------
type AlunoReal = {
  nome: string;
  nascimento: string; // ISO yyyy-mm-dd
  turno: "INTEGRAL" | "MANHA" | "TARDE";
  respNome: string;
  respCpf?: string;
  respEmail?: string;
  respTelefone?: string;
  mensalidade: number;
  dataMatricula?: string; // ISO yyyy-mm-dd, quando informado na planilha
  mensalidadeJulPaga?: boolean; // true quando a planilha já indicava "adimplente"
  semMensalidadeAinda?: boolean; // matrícula futura (ainda não começou)
};

const TURMAS_ALUNOS: { turma: string; capacidade: number; alunos: AlunoReal[] }[] = [
  {
    turma: "Berçário I",
    capacidade: 15,
    alunos: [
      { nome: "Bernardo Uhlmann Thewes", nascimento: "2025-07-27", turno: "INTEGRAL", respNome: "Lilian Osmari Uhlmann", respCpf: "006.195.730-58", respEmail: "uhlmannlilian@gmail.com", mensalidade: 2532.21 },
      { nome: "Conrado Minello de Almeida", nascimento: "2025-04-14", turno: "MANHA", respNome: "Andrieli Minello", respCpf: "027.671.280-38", respEmail: "minelloandrieli@gmail.com", mensalidade: 1182.77 },
      { nome: "Helena Rossetto Bortolotto", nascimento: "2025-10-15", turno: "MANHA", respNome: "Adriane do Nascimento Rossetto", respCpf: "009.828.640-43", respEmail: "adrirossettosm@gamail.com", mensalidade: 1182.77 },
      { nome: "Laís Colpo", nascimento: "2026-02-26", turno: "TARDE", respNome: "Tamara Leonardi", respCpf: "005.331.070-59", respEmail: "tamara-leonardi@hotmail.com", mensalidade: 1556.72 },
      { nome: "Luísa Colpo", nascimento: "2026-02-26", turno: "TARDE", respNome: "Tamara Leonardi", respCpf: "005.331.070-59", respEmail: "tamara-leonardi@hotmail.com", mensalidade: 1401.04 },
      { nome: "Lara Rizzetti Rutzig", nascimento: "2026-02-02", turno: "INTEGRAL", respNome: "Mateus Beck Rutzig", respCpf: "001.287.210-57", respEmail: "mateus@inf.ufsm.br", respTelefone: "55991868185", mensalidade: 2532.21, dataMatricula: "2026-09-01", semMensalidadeAinda: true },
      { nome: "Mateus Hister de Macedo", nascimento: "2025-08-16", turno: "TARDE", respNome: "Carmine Aparecida Lenz Hister", respCpf: "006.700.080-01", respEmail: "carmineh@gmail.com", mensalidade: 1401.05 },
      { nome: "Martin Menegon Pinheiro", nascimento: "2025-12-10", turno: "INTEGRAL", respNome: "Guilherme Emanuel Weiss Pinheiro", respCpf: "838.826.930-53", respEmail: "guilherme.pinheiro@ufsm.br", mensalidade: 2532.21 },
      { nome: "Olívia Avelar Tarouco", nascimento: "2025-06-03", turno: "INTEGRAL", respNome: "Camila Peligrinotti Tarouco", respCpf: "001.264.330-03", respEmail: "milatarouco@gmail.com", mensalidade: 2532.21 },
    ],
  },
  {
    turma: "Berçário II",
    capacidade: 15,
    alunos: [
      { nome: "Esther Corcini Maia", nascimento: "2024-11-05", turno: "TARDE", respNome: "Arnaldo Moraes Maia Junior", respCpf: "004.015.940-09", respEmail: "nataliecorcini@yahoo.com.br", mensalidade: 1396.80 },
      { nome: "Helena de Fátima Cossetin Rosso", nascimento: "2024-09-30", turno: "INTEGRAL", respNome: "Ricardo Benetti Rosso", respCpf: "019.093.320-89", respEmail: "ricardobenettirosso@gmail.com", mensalidade: 2303.80 },
      { nome: "Isabela Morcelli Alves", nascimento: "2025-02-08", turno: "INTEGRAL", respNome: "Carolina Italia Cargnin Morcelli", respCpf: "006.517.940-48", respEmail: "morcellialves@gmail.com", mensalidade: 2465.06 },
      { nome: "Joaquim Della Flora Carrillo", nascimento: "2024-07-10", turno: "INTEGRAL", respNome: "Saradia Della Flora", respCpf: "010.736.370-42", respEmail: "saradia.flora@ufsm.br", respTelefone: "55991130215", mensalidade: 2303.80 },
      { nome: "Laura Bento Martel", nascimento: "2025-03-01", turno: "MANHA", respNome: "Marcelle Bento Martel", respCpf: "151.531.367-01", respEmail: "marcelle.bento.s@gemail.com", mensalidade: 1117.14 },
      { nome: "Luana Wonsick Dall'Agnol", nascimento: "2025-03-09", turno: "INTEGRAL", respNome: "Gisele Wonsick Alves", respCpf: "002.473.390-32", respEmail: "gisele.wonsick@gmail.com", mensalidade: 2465.06 },
      { nome: "Luca Alberton de Lima", nascimento: "2024-10-22", turno: "MANHA", respNome: "Moyses Elyseu de Lima", respCpf: "022.172.000-62", respEmail: "delima.inf@gmail.com", mensalidade: 996.11 },
      { nome: "Luca Batista Querino", nascimento: "2025-03-09", turno: "TARDE", respNome: "Jorge de Ávila Querino Vieira", respCpf: "383.336.388-64", respEmail: "roger.querino@gmail.com", mensalidade: 1494.57 },
      { nome: "Marina Sabino Ineu", nascimento: "2025-01-26", turno: "TARDE", respNome: "Rafael Porto Ineu", respCpf: "689.568.430-15", respEmail: "rafaelineu@gmail.com", mensalidade: 1257.12 },
      { nome: "Matteo Puchale Bressa", nascimento: "2024-07-11", turno: "TARDE", respNome: "Anelise Lucion Puchale", respCpf: "019.146.510-06", respEmail: "aneliselucion@gmail.com", mensalidade: 1245.48 },
      { nome: "Murilo Vargas Forgiarini", nascimento: "2024-10-19", turno: "TARDE", respNome: "Denice Vargas da Silva Forgiarini", respCpf: "008.032.250-67", respEmail: "deniceforgiarini@gmail.com", mensalidade: 1494.57 },
    ],
  },
  {
    turma: "Maternal I",
    capacidade: 20,
    alunos: [
      { nome: "Allan Souza Carvalho", nascimento: "2024-01-19", turno: "TARDE", respNome: "Aylla Santos Sousa Carvalho", respCpf: "025.177.272-10", respEmail: "aylla.pbs@gmail.com", mensalidade: 1494.57 },
      { nome: "Arthur Antonio Dias Gomes", nascimento: "2023-10-19", turno: "MANHA", respNome: "Jéssica Doyle Dias", respCpf: "043.501.040-97", respEmail: "jessicadias9651@gmail.com", mensalidade: 0 },
      { nome: "Augusto Flores Prado", nascimento: "2023-12-31", turno: "TARDE", respNome: "Mariana Martins Flores", respCpf: "009.477.280-07", respEmail: "marianamflores@yahoo.com.br", mensalidade: 1396.80 },
      { nome: "Eduardo Alves Fiorin", nascimento: "2023-07-10", turno: "INTEGRAL", respNome: "Rubens Alex Fiorin", respCpf: "002.123.680-10", respEmail: "rubens.fiorin@gmail.com", mensalidade: 2044.22 },
      { nome: "Helena Tonetto Bertagnolli", nascimento: "2023-12-13", turno: "TARDE", respNome: "Jéssica Grace Tonetto", respCpf: "009.396.550-80", respEmail: "jessica_tonetto@yahoo.com.br", mensalidade: 1332.66 },
      { nome: "Ísis Plentz Alves", nascimento: "2023-12-11", turno: "TARDE", respNome: "Jaime Cardozo Alves", respCpf: "928.864.770-87", respEmail: "jaimecardozoalves@gmail.com", mensalidade: 1494.57 },
      { nome: "Martin Aires Giacomelli", nascimento: "2023-06-20", turno: "INTEGRAL", respNome: "Robson Giacomeli", respCpf: "014.000.420-38", respEmail: "robsongiacomeli@yahoo.com.br", mensalidade: 2303.80 },
      { nome: "Mathias Pipi Wentzel", nascimento: "2024-02-06", turno: "INTEGRAL", respNome: "Marcos Leandro Wentzel", respCpf: "682.172.180-72", respEmail: "marcoswentzel@gmail.com", mensalidade: 2303.80 },
      { nome: "Melissa Trindade Kemerich", nascimento: "2023-12-18", turno: "TARDE", respNome: "Roberto Kemerich", respCpf: "012.582.180-89", respEmail: "robertokemerich@gmail.com", mensalidade: 1396.80 },
      { nome: "Miguel Pereira Machado", nascimento: "2023-06-26", turno: "TARDE", respNome: "Aline Alfama Pereira Machado", respCpf: "015.201.980-43", respEmail: "geovaniealine@hotmail.com", mensalidade: 1396.80 },
      { nome: "Miguel Pinaffo Fidelis", nascimento: "2024-03-21", turno: "INTEGRAL", respNome: "Otávio Luiz Fidelis Junior", respCpf: "323.673.388-84", respEmail: "otaluf@gmail.com", mensalidade: 2218.55 },
      { nome: "Pedro Antônio Caetano da Silva Corcini", nascimento: "2023-05-20", turno: "INTEGRAL", respNome: "Laís Mara Caetano da Silva Corcini", respCpf: "338.878.398-54", respEmail: "laismara.silva@gmail.com", mensalidade: 2303.80 },
      { nome: "Bento Bertolin da Silveira", nascimento: "2023-06-02", turno: "MANHA", respNome: "Kaline Bertolin", respCpf: "053.353.199-33", respEmail: "bertolin.ka@gmail.com", respTelefone: "55997332034", mensalidade: 1117.14, dataMatricula: "2026-07-01", mensalidadeJulPaga: true },
    ],
  },
  {
    turma: "Maternal II",
    capacidade: 20,
    alunos: [
      { nome: "Aurora Balbinot Azzi", nascimento: "2023-02-25", turno: "MANHA", respNome: "Aline Balbinot", respCpf: "007.370.440-71", respEmail: "alinebalbinot@yahoo.com.br", mensalidade: 1044.06 },
      { nome: "Aurora Cavalheiro Penteado", nascimento: "2022-10-21", turno: "TARDE", respNome: "Filipe Vinicius Penteado Scaranaro", respCpf: "536.074.062-00", respEmail: "penteado.filipe@gmail.com", mensalidade: 1494.57 },
      { nome: "Cauê Rodrigues de Freitas", nascimento: "2024-08-24", turno: "TARDE", respNome: "Alexssandro de Freitas de Morais", respCpf: "854.559.110-15", respEmail: "alexssandro_freitas@hotmail.com", mensalidade: 1396.80 },
      { nome: "Estela Negrini Carloto", nascimento: "2022-06-01", turno: "TARDE", respNome: "Michele Negrini", respCpf: "805.163.510-87", respEmail: "mmnegrini@yahoo.com.br", mensalidade: 0 },
      { nome: "Joaquim Inácio Benini Bragagnolo", nascimento: "2023-06-22", turno: "MANHA", respNome: "Ana Lia Benini Bragagnolo", respCpf: "012.244.240-77", respEmail: "analiabenini@yahoo.com.br", mensalidade: 1117.14 },
      { nome: "Luisa dos Santos Pacheco", nascimento: "2022-09-21", turno: "MANHA", respNome: "Alysson Pacheco", respCpf: "014.007.950-52", respEmail: "alysson.o.pacheco@gmail.com", mensalidade: 1117.14 },
      { nome: "Luísa Puchale Bressa", nascimento: "2023-01-11", turno: "TARDE", respNome: "Anelise Lucion Puchale", respCpf: "019.146.510-06", respEmail: "aneliselucion@gmail.com", mensalidade: 1396.80 },
      { nome: "Marco Antônio Raddatz Perlin", nascimento: "2022-04-28", turno: "TARDE", respNome: "Michele Raddatz", respCpf: "998.043.790-15", respEmail: "michele_raddatz_81@hotmail.com", mensalidade: 1345.11 },
      { nome: "Maria Antônia Machado Wallau", nascimento: "2023-09-25", turno: "MANHA", respNome: "Gilmar Azeredo Wallau Júnior", respCpf: "033.761.400-81", respEmail: "gilmarwallau@gmail.com", mensalidade: 1117.14 },
      { nome: "Maria Cecília Granzotto de Oliveira", nascimento: "2022-12-27", turno: "TARDE", respNome: "Maiandra Granzotto Ferreira", respCpf: "052.355.570-93", respEmail: "maiandragranzottferreira@gmail.com", mensalidade: 1494.57 },
      { nome: "Maria Helena Alberton de Lima", nascimento: "2022-06-30", turno: "MANHA", respNome: "Moyses Elyseu de Lima", respCpf: "022.172.000-62", respEmail: "delima.inf@gmail.com", mensalidade: 1117.14 },
      { nome: "Matteo Tolotti Vargas", nascimento: "2023-02-11", turno: "TARDE", respNome: "Marcelo de Souza Vargas", respCpf: "001.599.240-30", respEmail: "marcelo.desouzavargas@gmail.com", mensalidade: 1245.48 },
      { nome: "Rafael do Carmo Hunhoff", nascimento: "2022-08-30", turno: "TARDE", respNome: "Cristina Grazzioli do Carmo", respCpf: "004.470.520-47", respEmail: "cris_grazzioli@hotmail.com", respTelefone: "55991328857", mensalidade: 1494.57 },
      { nome: "Théo Souza Munhoz", nascimento: "2022-09-03", turno: "INTEGRAL", respNome: "Déborah Andrade Munhoz", respCpf: "018.784.320-10", respEmail: "deh.a.s@hotmail.com", mensalidade: 2303.80 },
      { nome: "Verônica Rossato Lima", nascimento: "2023-02-21", turno: "INTEGRAL", respNome: "João Vicente Ferreira Lima", respCpf: "006.391.970-27", respEmail: "lima.joao.vicente@gmail.com", mensalidade: 2303.80 },
    ],
  },
  {
    turma: "Pré-escola I",
    capacidade: 25,
    alunos: [
      { nome: "Alisson Reisdorfer Macedo", nascimento: "2021-09-15", turno: "INTEGRAL", respNome: "Ariele Priebe Reisdorfer", respCpf: "021.454.000-60", respEmail: "arielereisdorfer@hotmail.com", mensalidade: 2303.80 },
      { nome: "Antonella Tonetto Bertagnolli", nascimento: "2022-03-10", turno: "TARDE", respNome: "Jéssica Grace Tonetto", respCpf: "009.396.550-80", respEmail: "jessica_tonetto@yahoo.com.br", mensalidade: 1396.80 },
      { nome: "Benício Rodrigues Aires", nascimento: "2022-01-17", turno: "TARDE", respNome: "Jairo Rodrigues", respCpf: "771.478.390-72", respEmail: "jairorodrigues75@yahoo.com.br", mensalidade: 1396.80 },
      { nome: "Elisa de Fátima Camargo", nascimento: "2021-05-13", turno: "INTEGRAL", respNome: "Cláudia Jaqueline Gomes Camargo", respCpf: "034.230.470-46", respEmail: "cdaclaudiajaqueline@gmail.com", mensalidade: 522.00 },
      { nome: "Elisa Hernandez Arboleda", nascimento: "2022-03-13", turno: "TARDE", respNome: "Sergio Alejandro Arboleda Duque", respCpf: "063.286.737-01", respEmail: "ale.jo96@icloud.com", mensalidade: 1396.80 },
      { nome: "Fernando Soares de Oliveira Krug", nascimento: "2021-10-04", turno: "TARDE", respNome: "Élisson Krug Oliveira", respCpf: "003.733.000-42", respEmail: "ekrug.orl@gmail.com", mensalidade: 1494.57 },
      { nome: "Kauã Cirolini Cardoso", nascimento: "2021-12-28", turno: "TARDE", respNome: "Sergio da Silva Cardoso", respCpf: "019.793.480-30", respEmail: "sergiodasilvacardoso@hotmail.com", mensalidade: 1396.80 },
      { nome: "Mathias Lagomarsino Beux", nascimento: "2021-09-21", turno: "TARDE", respNome: "Mauricio Beux dos Santos", respCpf: "004.398.150-02", respEmail: "mbeuxs@gmail.com", mensalidade: 1396.80 },
      { nome: "Melissa Pinaffo Fidelis", nascimento: "2021-07-11", turno: "TARDE", respNome: "Otávio Luiz Fidelis Junior", respCpf: "323.673.388-84", respEmail: "otaluf@gmail.com", mensalidade: 2303.80 },
      { nome: "Mercedita Janke Salgado", nascimento: "2021-04-17", turno: "TARDE", respNome: "Aquiara Janke Fighera Salgado", respCpf: "007.208.510-09", respEmail: "aquiarajanke@hotmail.com", mensalidade: 1396.80 },
      { nome: "Rafael Costa Fagundes de Oliveira", nascimento: "2021-08-02", turno: "TARDE", respNome: "Diego Fagundes de Oliveira", respCpf: "093.880.216-06", respEmail: "fagundesdfo@gmail.com", mensalidade: 1494.57 },
      { nome: "Théo Muller Elói", nascimento: "2021-12-03", turno: "INTEGRAL", respNome: "Uillian Ranieri Maydana Elói", respCpf: "035.753.590-16", respEmail: "uillianr9314@gmail.com", mensalidade: 2303.80 },
      { nome: "Valentina Badke Negrini", nascimento: "2022-03-09", turno: "TARDE", respNome: "Eveline Negrini", respCpf: "019.416.910-30", respEmail: "evelinebadke@gmail.com", mensalidade: 1396.80 },
    ],
  },
  {
    turma: "Pré-escola II",
    capacidade: 25,
    alunos: [
      { nome: "Alice Brum Tagliani Lúcio", nascimento: "2020-07-28", turno: "TARDE", respNome: "Thais Pagel Brum Tagliani", respCpf: "006.002.482-83", respEmail: "thais.tagliani@gmail.com", mensalidade: 1494.57 },
      { nome: "Davi Loures Lazzari", nascimento: "2020-07-02", turno: "TARDE", respNome: "Rodrigo Lazzari", respCpf: "009.955.440-26", respEmail: "rodrigolazzari@gmail.com", mensalidade: 1245.48 },
      { nome: "Elisa Fighera Cargnelutti", nascimento: "2020-07-22", turno: "INTEGRAL", respNome: "Andressa Fighera", respCpf: "003.035.600-88", respEmail: "andressafighera@gmail.com", mensalidade: 2465.06 },
      { nome: "Elisa Prade Limana", nascimento: "2020-04-20", turno: "TARDE", respNome: "Aline Marcia Prade", respCpf: "034.216.100-88", respEmail: "alineprade100@gmail.com", mensalidade: 1494.57 },
      { nome: "Gabriel Stangherlin Marchesan", nascimento: "2020-04-14", turno: "TARDE", respNome: "Gustavo Marchesan", respCpf: "011.682.870-65", respEmail: "gutomarchesan@gmail.com", mensalidade: 1396.80 },
      { nome: "Lívia Sabino Ineu", nascimento: "2020-12-05", turno: "TARDE", respNome: "Rafael Porto Ineu", respCpf: "689.568.430-15", respEmail: "rafaelineu@gmail.com", mensalidade: 1396.80 },
      { nome: "Luara Minuzzi Marin", nascimento: "2021-03-07", turno: "TARDE", respNome: "Charles Marin", respCpf: "637.719.180-48", respEmail: "pozzomar@gmail.com", mensalidade: 1396.80 },
      { nome: "Lucas Alves Fiorin", nascimento: "2020-04-15", turno: "INTEGRAL", respNome: "Rubens Alex Fiorin", respCpf: "002.123.680-10", respEmail: "rubens.fiorin@gmail.com", mensalidade: 2080.87 },
      { nome: "Maria Manoela Souza Papalia", nascimento: "2020-10-07", turno: "TARDE", respNome: "Cilo Antônio Papalia Junior", respCpf: "016.647.290-54", respEmail: "juniorpapalia@gmail.com", mensalidade: 1396.80 },
      { nome: "Martin Hister de Macedo", nascimento: "2020-09-10", turno: "TARDE", respNome: "Carmine Aparecida Lenz Hister", respCpf: "006.700.080-01", respEmail: "carmineh@gmail.com", mensalidade: 1396.80 },
      { nome: "Matheus Borges Moro", nascimento: "2020-05-07", turno: "TARDE", respNome: "Fernanda Laynara Motta Borges Moro", respCpf: "125.343.487-52", respEmail: "fernandalaynara@hotmail.com", mensalidade: 1470.23 },
      { nome: "Murilo de Souza Ribas", nascimento: "2020-12-27", turno: "TARDE", respNome: "Oigres da Costa Ribas", respCpf: "026.853.200-16", respEmail: "oigrespf@gmail.com", mensalidade: 1396.80 },
      { nome: "Ornella da Conceição Carvalho", nascimento: "2020-10-26", turno: "TARDE", respNome: "Gloria Machado da Conceição", respCpf: "010.745.560-97", respEmail: "gloria.mconceicao@gmail.com", mensalidade: 1396.80 },
      { nome: "Otto Pohl Bredow", nascimento: "2020-05-15", turno: "INTEGRAL", respNome: "Virginia Heinze Pohl", respCpf: "000.002.500-31", respEmail: "viheinzepohl@yahoo.com.br", mensalidade: 2303.80 },
      { nome: "Samuel da Rosa de Souza", nascimento: "2020-12-29", turno: "TARDE", respNome: "Jorge Luiz dos Santos de Souza", respCpf: "772.141.700-78", respEmail: "jorge.jotaluiz2003@gamil.com", mensalidade: 1494.57 },
    ],
  },
  {
    turma: "1º Ano",
    capacidade: 30,
    alunos: [
      { nome: "Camillo Tolotti Vargas", nascimento: "2020-01-26", turno: "TARDE", respNome: "Marcelo de Souza Vargas", respCpf: "001.599.240-30", respEmail: "marcelo.desouzavargas@gmail.com", mensalidade: 1443.09 },
      { nome: "Davi Menezes Gass", nascimento: "2019-09-03", turno: "TARDE", respNome: "Jovani Soares Gass", respCpf: "006.879.820-22", respEmail: "jovanigass@yahoo.com.br", mensalidade: 1443.09 },
      { nome: "Joaquim Farencena Sarturi", nascimento: "2019-04-13", turno: "INTEGRAL", respNome: "Gessélda Somavilla Farencena", respCpf: "010.811.090-76", respEmail: "gesseldaf@yahoo.com.br", mensalidade: 2511.57 },
      { nome: "Maria Luísa Schmidt Calegari", nascimento: "2019-12-10", turno: "INTEGRAL", respNome: "Dionatan Calegari de Oliveira", respCpf: "013.715.630-80", respEmail: "dionatanbrok@yahoo.com.br", mensalidade: 2511.57 },
      { nome: "Mariah Ramos Busanello", nascimento: "2019-10-31", turno: "INTEGRAL", respNome: "Adda dos Santos Ramos", respCpf: "584.940.490-20", respEmail: "fabianeramos.3110@gmail.com", mensalidade: 2511.57 },
      { nome: "Maythê Mehy Santos Silva", nascimento: "2020-01-25", turno: "INTEGRAL", respNome: "Albert Silva Bonfim", respCpf: "032.220.668-93", respEmail: "albertmedmh@gmail.com", mensalidade: 2511.57 },
      { nome: "Arthur da Silveira Frank", nascimento: "2019-12-22", turno: "TARDE", respNome: "Maurício Antônio Frank", respCpf: "960.702.180-00", respEmail: "marcioantoniofrank@gmail.com", mensalidade: 1544.10 },
    ],
  },
  {
    turma: "2º Ano",
    capacidade: 30,
    alunos: [
      { nome: "Arthur Magalhães Lippert", nascimento: "2019-02-14", turno: "INTEGRAL", respNome: "Roberta Magalhães", respCpf: "976.573.790-49", respEmail: "roberta@fordsuperauto.com.br", mensalidade: 2511.57 },
      { nome: "Bernardo Mascarenhas da Silva", nascimento: "2018-10-22", turno: "TARDE", respNome: "Diego Mascarenhas", respCpf: "012.363.390-70", respEmail: "diego_silva@ufsm.br", mensalidade: 1443.09 },
      { nome: "Enrico Costa Quispe", nascimento: "2018-07-25", turno: "TARDE", respNome: "Rene Quispe Rodriguez", respCpf: "233.667.348-76", respEmail: "alanacostaquispe@gmail.com", mensalidade: 1443.09 },
      { nome: "Giovanna Zambon Zimermann", nascimento: "2018-11-23", turno: "TARDE", respNome: "Hans Rogério Zimmermann", respCpf: "976.370.410-34", respEmail: "luzambon@gmail.com", mensalidade: 1443.09 },
      { nome: "Gonçalo Nascimento Tomazzetti", nascimento: "2018-12-28", turno: "TARDE", respNome: "Marcelo Tomazetti Balconi", respCpf: "028.394.730-62", respEmail: "marcelobalconi1996@gmail.com", mensalidade: 1544.10 },
      { nome: "Júlia Maffini Bortoluzzi", nascimento: "2019-03-27", turno: "TARDE", respNome: "Anderson Campanhola Bortoluzzi", respCpf: "994.006.770-49", respEmail: "fernandamaffini@yahoo.com.br", mensalidade: 1443.09 },
      { nome: "Laura Luisa Friedrich", nascimento: "2018-10-15", turno: "TARDE", respNome: "Júlia Luisa Schiefelbein", respCpf: "033.502.000-36", respEmail: "julia.schiefelbein@gmail.com", mensalidade: 1443.09 },
      { nome: "Milena Raddatz Perlin", nascimento: "2018-07-17", turno: "TARDE", respNome: "Michele Raddatz", respCpf: "998.043.790-15", respEmail: "michele_raddatz_81@hotmail.com", mensalidade: 1443.09 },
      { nome: "Théo Savegnago Cherobini", nascimento: "2019-03-01", turno: "TARDE", respNome: "Carine Savegnago", respCpf: "015.035.630-73", respEmail: "carine_savegnago@hotmail.com", mensalidade: 2511.57 },
    ],
  },
  {
    turma: "3º Ano",
    capacidade: 30,
    alunos: [
      { nome: "Alice Borges Moro", nascimento: "2018-01-13", turno: "TARDE", respNome: "Fernanda Laynara Motta Borges Moro", respCpf: "125.343.487-52", respEmail: "fernandalaynara@hotmail.com", mensalidade: 1672.75 },
      { nome: "Alice Loures Lazzari", nascimento: "2018-01-20", turno: "TARDE", respNome: "Rodrigo Lazzari", respCpf: "009.955.440-26", respEmail: "rodrigolazzari@gmail.com", mensalidade: 1443.09 },
      { nome: "Alice Nascimento Rocha", nascimento: "2017-05-05", turno: "TARDE", respNome: "Maiara de Arruda Nascimento", respCpf: "009.350.390-31", respEmail: "maiara.an@gmail.com", mensalidade: 1443.09 },
      { nome: "Alice Silveira Millani", nascimento: "2018-01-03", turno: "TARDE", respNome: "", mensalidade: 0 },
      { nome: "Ana Beatriz de Brito Pedrosa Vasconcelos", nascimento: "2017-07-08", turno: "INTEGRAL", respNome: "Flávia Maria de Brito Pedrosa Vasconcelos", respCpf: "970.225.003-04", respEmail: "flavia.p.vasconcelos@ufsm.br", mensalidade: 2511.57 },
      { nome: "Antonia Leite Badke Trindade", nascimento: "2018-01-10", turno: "TARDE", respNome: "Fernanda Josieli Leite dos Santos", respCpf: "028.980.910-06", respEmail: "fernandajosielileite@gmail.com", mensalidade: 1443.09 },
      { nome: "Isabela Neujahr Ceolin", nascimento: "2017-11-09", turno: "INTEGRAL", respNome: "Tarcisio Ceolin Junior", respCpf: "003.989.410-09", respEmail: "tarcisio@ceolin.org", mensalidade: 2511.57 },
      { nome: "Luiza Lopes Kemel", nascimento: "2017-06-01", turno: "TARDE", respNome: "Bruna de Moraes Lopes", respCpf: "027.616.120-35", respEmail: "brunakemel@outlook.com", mensalidade: 721.54 },
    ],
  },
  // Contraturno: turmas existem de fato (confirmadas no "Controle de Materiais CDA
  // 2026"), mas ainda sem matrícula individual registrada na planilha oficial.
  { turma: "Contraturno I", capacidade: 25, alunos: [] },
  { turma: "Contraturno II", capacidade: 25, alunos: [] },
  { turma: "Contraturno III", capacidade: 25, alunos: [] },
  { turma: "Contraturno IV", capacidade: 25, alunos: [] },
  { turma: "Contraturno V", capacidade: 25, alunos: [] },
];

// ---------------------------------------------------------------------------
// FUNCIONÁRIOS REAIS — Funcionarios_Ordenados_CDA_Carinha_com_VT (Google
// Drive). A planilha não traz CPF; o campo fica em aberto para a secretaria
// completar depois pela tela de edição.
// ---------------------------------------------------------------------------
type FuncionarioReal = { nome: string; empresa: string; cargo: string; admissao: string; valeTransporte: boolean };

const FUNCIONARIOS_REAIS: FuncionarioReal[] = [
  { nome: "Amanda Gonçalves dos Reis", empresa: "Carinha de Anjo", cargo: "Monitor(a)", admissao: "2026-03-24", valeTransporte: true },
  { nome: "Ana Letícia Proensa Ferreira", empresa: "Carinha de Anjo", cargo: "Sócio Administrador", admissao: "2015-11-01", valeTransporte: false },
  { nome: "Andressa Naibert Rodrigues", empresa: "Carinha de Anjo", cargo: "Monitor(a)", admissao: "2026-04-15", valeTransporte: false },
  { nome: "Antonio Stona", empresa: "Carinha de Anjo", cargo: "Professor de Inglês (4 a 6 anos)", admissao: "2026-04-15", valeTransporte: true },
  { nome: "Carla Danúbia Güntzel de Freitas", empresa: "Carinha de Anjo", cargo: "Diretor(a)", admissao: "2012-06-01", valeTransporte: false },
  { nome: "Carolina Silveira Rodrigues", empresa: "Carinha de Anjo", cargo: "Monitor(a)", admissao: "2023-02-16", valeTransporte: true },
  { nome: "Caroline Padilha Santana", empresa: "Carinha de Anjo", cargo: "Monitor(a)", admissao: "2026-03-04", valeTransporte: false },
  { nome: "Claudia Jaqueline Machado Gomes", empresa: "Carinha de Anjo", cargo: "Professora de Educação Infantil", admissao: "2023-08-22", valeTransporte: false },
  { nome: "Debora Techio Sedrez", empresa: "Carinha de Anjo", cargo: "Monitor(a)", admissao: "2026-06-10", valeTransporte: true },
  { nome: "Delma Therezinha Rodrigues Bittencourt", empresa: "Carinha de Anjo", cargo: "Serviços Gerais", admissao: "2025-09-29", valeTransporte: true },
  { nome: "Edinéia Oliveira Silva", empresa: "Carinha de Anjo", cargo: "Monitor(a)", admissao: "2026-06-05", valeTransporte: false },
  { nome: "Eduarda Rodrigues Sturm", empresa: "Carinha de Anjo", cargo: "Secretária", admissao: "2024-07-29", valeTransporte: false },
  { nome: "Gabriela Vieira Schramm", empresa: "Carinha de Anjo", cargo: "Professora de Educação Infantil", admissao: "2023-08-03", valeTransporte: false },
  { nome: "Geovana Jacobsen Vargas", empresa: "Carinha de Anjo", cargo: "Professora de Educação Infantil", admissao: "2026-02-06", valeTransporte: false },
  { nome: "Gisele Serafim", empresa: "Carinha de Anjo", cargo: "Educador Especial", admissao: "2026-04-16", valeTransporte: false },
  { nome: "Jessica Doyle Dias", empresa: "Carinha de Anjo", cargo: "Cozinheira", admissao: "2024-10-23", valeTransporte: false },
  { nome: "Jessica Gelocha", empresa: "Carinha de Anjo", cargo: "Apoio Pedagógico", admissao: "2024-02-16", valeTransporte: false },
  { nome: "Lidiane Tadiello Bedinoto", empresa: "Carinha de Anjo", cargo: "Professora de Educação Infantil", admissao: "2015-08-17", valeTransporte: false },
  { nome: "Maria Eduarda Güntzel de Freitas", empresa: "Carinha de Anjo", cargo: "Secretária", admissao: "2022-01-07", valeTransporte: false },
  { nome: "Mariana de Souza Carames", empresa: "Carinha de Anjo", cargo: "Professora de Educação Infantil", admissao: "2025-02-03", valeTransporte: false },
  { nome: "Melissa Santos de Oliveira", empresa: "Carinha de Anjo", cargo: "Educadora Especial", admissao: "2026-05-22", valeTransporte: false },
  { nome: "Natália Bolson da Silva", empresa: "Carinha de Anjo", cargo: "Professora de Educação Infantil", admissao: "2024-08-13", valeTransporte: false },
  { nome: "Priscila Proensa Ferreira", empresa: "Carinha de Anjo", cargo: "Coordenadora Pedagógica", admissao: "2021-09-01", valeTransporte: false },
  { nome: "Sheron Quinto Togni", empresa: "Carinha de Anjo", cargo: "Assistente em Educação", admissao: "2024-08-16", valeTransporte: false },
  { nome: "Suelen Merladete Guedes", empresa: "Carinha de Anjo", cargo: "Monitor(a)", admissao: "2025-03-10", valeTransporte: true },
  { nome: "Tais Canfild Veiga Trindade", empresa: "Carinha de Anjo", cargo: "Professora de Educação Infantil", admissao: "2026-01-21", valeTransporte: true },
  { nome: "Vanderléia Pedrolo Pozzobon", empresa: "Carinha de Anjo", cargo: "Serviços Gerais", admissao: "2026-04-23", valeTransporte: false },
  { nome: "Ana Letícia Proensa Ferreira", empresa: "CDA Ensino Fundamental", cargo: "Sócio Administrador", admissao: "2025-07-01", valeTransporte: false },
  { nome: "Carla Danúbia Güntzel de Freitas", empresa: "CDA Ensino Fundamental", cargo: "Diretor(a)", admissao: "2025-07-01", valeTransporte: false },
  { nome: "Claudia Jaqueline Machado Gomes", empresa: "CDA Ensino Fundamental", cargo: "Professora das Séries Iniciais", admissao: "2025-02-24", valeTransporte: false },
  { nome: "Gabriela dos Santos Oliveira", empresa: "CDA Ensino Fundamental", cargo: "Professora das Séries Iniciais", admissao: "2026-06-02", valeTransporte: false },
  { nome: "Gabriela Vieira Schramm", empresa: "CDA Ensino Fundamental", cargo: "Professor de Inglês", admissao: "2026-02-11", valeTransporte: false },
  { nome: "Geovana Jacobsen Vargas", empresa: "CDA Ensino Fundamental", cargo: "Assistente em Educação", admissao: "2026-02-06", valeTransporte: false },
  { nome: "Jessica Gelocha", empresa: "CDA Ensino Fundamental", cargo: "Professora das Séries Iniciais", admissao: "2024-02-16", valeTransporte: false },
  { nome: "Ricardo Dorneles Correa Rodrigues", empresa: "CDA Ensino Fundamental", cargo: "Professor", admissao: "2026-01-21", valeTransporte: false },
];

function setorPorCargo(cargo: string): string {
  const c = cargo.toLowerCase();
  if (c.includes("sócio") || c.includes("diretor")) return "Direção";
  if (c.includes("coordenad")) return "Coordenação";
  if (c.includes("secretár")) return "Secretaria";
  if (c.includes("cozinh")) return "Cozinha";
  if (c.includes("serviços gerais")) return "Serviços Gerais";
  return "Pedagógico";
}

// ---------------------------------------------------------------------------
// DOCUMENTOS INSTITUCIONAIS — catalogados a partir das pastas "Credenciamento
// CDA" e "Escola CDA" no Google Drive. Ficam como referência (link), sem
// re-hospedar os binários.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// CONTROLE DE MATERIAIS REAL — extraído do "Controle_de_Materiais_CDA_2026.pdf"
// enviado pela escola. `turma` casa com o grupo de TURMAS_ALUNOS e
// `nomeContem` identifica o aluno pelo primeiro nome usado no PDF.
// ---------------------------------------------------------------------------
type ControleMaterialSeed = { turma: string; nomeContem: string; itensFaltantes?: string; trouxe?: boolean; prazoReenvio?: string };

const CONTROLE_MATERIAL_SEED: ControleMaterialSeed[] = [
  { turma: "Berçário I", nomeContem: "Bernardo Uhlmann", itensFaltantes: "Material completo", trouxe: true },
  { turma: "Berçário I", nomeContem: "Mateus Hister", itensFaltantes: "Material completo", trouxe: true },
  { turma: "Berçário I", nomeContem: "Olívia Avelar", itensFaltantes: "Trouxe 3 pacotes de bolinhas em gel, 2 metros de algodão cru, 1 ursinho de pelúcia, 1 lanterna pequena e recarregável, 1 bola" },
  { turma: "Berçário II", nomeContem: "Marina Sabino", itensFaltantes: "Falta camiseta", prazoReenvio: "2026-02-05" },
  { turma: "Berçário II", nomeContem: "Joaquim Della Flora", itensFaltantes: "Tudo ok", trouxe: true },
  { turma: "Berçário II", nomeContem: "Matteo Puchale", itensFaltantes: "Papel pardo, algodão" },
  { turma: "Maternal I", nomeContem: "Ísis Plentz", itensFaltantes: "1 lupa, 1 apontador jumbo com depósito e 5 sacos plásticos", prazoReenvio: "2026-02-05" },
  { turma: "Maternal I", nomeContem: "Melissa Trindade", itensFaltantes: "1 pacote de folhas A4 kraft, 1 marcador duplo, apontador com depósito e 1 bandeja branca" },
  { turma: "Maternal II", nomeContem: "Rafael do Carmo", itensFaltantes: "Revistas, jogo pedagógico, bandeja, camiseta, Kit Brinquedo, livro, materiais" },
  { turma: "Maternal II", nomeContem: "Luísa Puchale", itensFaltantes: "Papel Pardo" },
  { turma: "Maternal II", nomeContem: "Matteo Tolotti", itensFaltantes: "Apontador" },
  { turma: "1º Ano", nomeContem: "Mariah Ramos", itensFaltantes: "Estojo com os materiais dentro e a tela de artesanato 20x30" },
  { turma: "1º Ano", nomeContem: "Camillo Tolotti", itensFaltantes: "1 pacote de folha kraft 280g (50 unid), 1 caixa de tinta tons de pele 8 cores, 2 revistas para recorte e estojo com os materiais solicitados dentro", prazoReenvio: "2026-02-11" },
  { turma: "1º Ano", nomeContem: "Maria Luísa Schmidt", itensFaltantes: "1 estojo com os materiais solicitados dentro" },
  { turma: "1º Ano", nomeContem: "Arthur da Silveira", itensFaltantes: "3 materiais provocadores, corda sintética de 8mm, caneta giz de cor sortida e 1 revista para recorte (veio 1 tinta guache 6 cores e 1 caderno 96 folhas a mais)" },
  { turma: "2º Ano", nomeContem: "Bernardo Mascarenhas", itensFaltantes: "Material completo", trouxe: true },
  { turma: "2º Ano", nomeContem: "Giovanna Zambon", itensFaltantes: "1 pacote de papel A4 kraft 180g (50 unid)" },
];

const DOCUMENTOS_SEED: { titulo: string; categoria: DocumentoCategoria; subcategoria: string; arquivoUrl: string }[] = [
  { titulo: "Alvará de Funcionamento", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1dp9P9l4BLYMeGYt9oMyCHmkjRekBS-5f/view" },
  { titulo: "PPCI - Plano de Prevenção Contra Incêndio", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1H63Yr7JXV7gsJRLIzKWkvqV7Ksrt_ylr/view" },
  { titulo: "Cadastro da Mantenedora", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1wt77o0F7mtthAUfbtgPykQ5CWa3iz7rQ/view" },
  { titulo: "Declaração de Acessibilidade", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1LMaSbhTSetA2LkMCM11TNAWVxNuU6i66/view" },
  { titulo: "Relação do Corpo Docente", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/17mijT-bznAUWlsWLKLcmSBKwuwy6KtRs/view" },
  { titulo: "Relação do Corpo Administrativo e Pedagógico", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1E8gE7EaoAVhHGbapa22NESUK4B1r91Ri/view" },
  { titulo: "Relação de Documentos Complementares", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1FTe6HwUaA11kRmqTcfzw7q8x6pFHFeXg/view" },
  { titulo: "Fotos das Instalações e Acessibilidade", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1TwbjRxy_8S8ceeoxMLRQdQiGLr5t95Cu/view" },
  { titulo: "Anexo I", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1m8BdxyMLfnKMPDlFeKCw14Hl8811UAIP/view" },
  { titulo: "Anexo II", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1Rh5fLIs6fSuLJvR-vMTgJgW3yrfIR9LL/view" },
  { titulo: "Quadro de Ocupação das Salas de Aula", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1lYcMDxHOMMT3_7cw-Ba7oYyRZ2cmr0uu/view" },
  { titulo: "Checklist de Credenciamento - Ensino Fundamental", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1t1E8UUq3Dhlfg3gMO9mOgATAaP4ZUbHd/view" },
  { titulo: "Protocolo de Recebimento", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1Or6rsA9-rQbphrbd8DNFzKXUXB9zJ5E4/view" },
  { titulo: "Ofício CEEd-RS", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1QZjb-5MR8PplzpQjeVxzCuwN-2CK5CPl/view" },
  { titulo: "Cartão CNPJ", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1V0LnbeX41p8_L_fXezs1rG1bufxHKByu/view" },
  { titulo: "Parecer Técnico - Isenção Bombeiros", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1ke9rJNELd1sqTn6PRslAjkUYhld4l7Pe/view" },
  { titulo: "Documentos Complementares (pacote completo)", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/1ahG8J09vfFPqt36rpd4po0Icz9WPv2Ke/view" },
  { titulo: "Fotos Associadas Escola CDA - CEEd 2024 (parte 1)", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/18q5VYwqGEv8DR-ZwIY4-Bu7kyBtmy_-f/view" },
  { titulo: "Fotos Associadas Escola CDA - CEEd 2024 (parte 2)", categoria: "LEGALIZACAO", subcategoria: "Credenciamento", arquivoUrl: "https://drive.google.com/file/d/15N9muw21Tzmqp89GkSskNy0YQ9rj5-Iw/view" },

  { titulo: "Contrato de Locação", categoria: "CONTRATOS", subcategoria: "Imóvel", arquivoUrl: "https://drive.google.com/file/d/1l0OHN1IDc885xcrQjXtb8E-Iet4tK0CU/view" },

  { titulo: "Recibo de Pagamento - Jun/2026 (Carinha de Anjo)", categoria: "FINANCEIRO", subcategoria: "Folha de Pagamento", arquivoUrl: "https://drive.google.com/file/d/1mnHorhtWN9sZmQL6TxTRfQihUqz_qVMU/view" },
  { titulo: "Recibo de Pagamento - Jun/2026 (CDA Ensino Fundamental)", categoria: "FINANCEIRO", subcategoria: "Folha de Pagamento", arquivoUrl: "https://drive.google.com/file/d/1ts5Wgd0psuecEpiOEDURxXIc7ORYgKms/view" },
  { titulo: "Carta Explicativa ITBI", categoria: "FINANCEIRO", subcategoria: "Impostos", arquivoUrl: "https://drive.google.com/file/d/18GsV1kkUMiBwizJT8eE0zhX7XCuUSLH4/view" },

  { titulo: "Controle de Ponto Eletrônico (modelo de referência)", categoria: "RH", subcategoria: "Ponto", arquivoUrl: "https://drive.google.com/file/d/1DG6_5FZf4QR6Yq97RWd8H1wa4A4FRt7s/view" },
  { titulo: "Modelo de Entrevista - Monitora", categoria: "RH", subcategoria: "Recrutamento", arquivoUrl: "https://drive.google.com/file/d/1JvGGhIURTKht2bvLWT-pkQbiWiF0pEze/view" },
  { titulo: "Avaliação Escrita - Monitora", categoria: "RH", subcategoria: "Recrutamento", arquivoUrl: "https://drive.google.com/file/d/1TslZW8hZMDsP6pYvIRCUC8DYmhPY6z2g/view" },

  { titulo: "Calendário Organizacional CDA 2026", categoria: "INSTITUCIONAL", subcategoria: "Calendário", arquivoUrl: "https://drive.google.com/file/d/1bUo2zNb-AfNNlSAFUc40kElpfNRHx0_G/view" },
  { titulo: "Regulamento 2026", categoria: "INSTITUCIONAL", subcategoria: "Regulamento", arquivoUrl: "https://drive.google.com/file/d/1FG-ZwuDl9Pw1LiyD8RswyCdQ8gy4NJqs/view" },
  { titulo: "Calendário Administrativo (rotina financeira mensal)", categoria: "INSTITUCIONAL", subcategoria: "Calendário", arquivoUrl: "https://drive.google.com/file/d/1GrxbrVaWTpo23pbRrdO6P1j3uBlXIytY/view" },
  { titulo: "Logo CDA", categoria: "INSTITUCIONAL", subcategoria: "Marca", arquivoUrl: "https://drive.google.com/file/d/1OP27-gA4kNZGokExMVFlzHr0_6eZ_yk_/view" },
  { titulo: "Logo CDA (fundo branco)", categoria: "INSTITUCIONAL", subcategoria: "Marca", arquivoUrl: "https://drive.google.com/file/d/15RuJ8nPWWGLYSZ-Md7c-TbqitLH0mHiz/view" },
];

// ---------------------------------------------------------------------------
// PONTO MANUAL REAL — folha de ponto em papel "Ponto de Controle Fundamental"
// de junho/2026, preenchida à mão pelas professoras e depois lançada pelo
// financeiro (é exatamente esse processo que o módulo Ponto substitui).
// Formato de cada linha: "dd/mm;entrada1;saida1;entrada2;saida2".
// Leitura best-effort da caligrafia: vale a pena o financeiro conferir e
// corrigir direto na tela caso ache alguma célula errada.
// ---------------------------------------------------------------------------
function m(hhmm: string): number {
  const [h, mm] = hhmm.split(":").map(Number);
  return h * 60 + mm;
}

function minutosTrabalhados(e1: string, s1: string, e2: string, s2: string): number {
  let total = 0;
  if (e1 && s1) total += m(s1) - m(e1);
  if (e2 && s2) total += m(s2) - m(e2);
  return total;
}

type PontoRowSpec = { nome: string; empresa: string; linhas: string[] };

const PONTO_MANUAL: PontoRowSpec[] = [
  {
    nome: "Geovana Jacobsen Vargas",
    empresa: "CDA Ensino Fundamental",
    linhas: [
      "01/06;08:00;11:59;;", "02/06;08:06;11:57;;", "03/06;08:05;11:59;;", "08/06;08:02;12:03;;", "09/06;08:01;11:58;;", "10/06;08:00;12:02;;", "11/06;08:00;11:58;;", "12/06;08:00;11:58;;",
      "15/06;08:04;11:58;;", "16/06;08:00;11:57;;", "17/06;08:00;12:01;;", "18/06;08:00;12:00;;", "19/06;08:01;11:58;;", "22/06;08:02;11:57;;", "23/06;08:05;11:59;;", "24/06;08:00;12:00;;",
      "25/06;08:01;12:12;;", "26/06;08:00;12:01;;", "30/06;08:00;12:00;;",
    ],
  },
  {
    nome: "Gabriela dos Santos Oliveira",
    empresa: "CDA Ensino Fundamental",
    linhas: [
      "01/06;13:00;17:00;17:15;19:00", "02/06;12:55;14:35;14:50;18:40", "03/06;12:55;17:10;17:25;18:10", "08/06;12:55;17:03;17:18;17:45", "09/06;12:55;14:41;14:56;17:45", "10/06;13:00;16:20;16:35;17:55", "11/06;12:55;15:18;15:33;18:10", "12/06;12:55;15:15;15:30;17:52", "13/06;08:00;10:18;10:33;12:05", "15/06;12:55;17:10;17:25;17:45", "16/06;12:55;14:40;14:55;17:45", "17/06;12:55;16:25;16:40;17:45", "18/06;12:55;15:05;15:20;17:50", "19/06;12:55;15:11;15:26;17:45", "22/06;12:55;17:05;17:20;17:50", "23/06;13:00;14:41;14:56;17:45", "24/06;12:55;16:20;16:35;17:50", "25/06;12:55;15:05;15:20;17:48", "26/06;12:55;15:20;15:35;17:50", "27/06;12:30;15:50;16:10;18:35", "29/06;12:55;15:15;15:30;17:45", "30/06;12:55;14:36;14:51;17:45",
    ],
  },
  {
    nome: "Jessica Gelocha",
    empresa: "CDA Ensino Fundamental",
    linhas: [
      "01/06;12:55;16:30;16:45;19:00", "02/06;12:55;16:30;16:45;17:45", "03/06;12:55;16:30;16:45;17:45", "08/06;12:55;16:30;16:45;17:45", "09/06;12:55;16:30;16:45;18:00", "10/06;12:55;16:30;16:45;17:45", "11/06;12:55;16:30;16:45;17:45", "12/06;12:55;16:30;16:45;17:45", "13/06;08:00;10:18;;", "15/06;12:55;16:15;16:30;17:45", "16/06;12:55;17:00;17:15;17:45", "17/06;12:55;16:15;16:30;17:45", "18/06;12:55;16:15;16:30;17:45", "19/06;12:55;16:15;16:30;17:45", "22/06;12:55;16:20;16:35;17:45", "23/06;12:55;16:20;16:35;17:45", "24/06;12:55;16:15;16:30;17:45", "25/06;12:55;16:15;16:30;17:45", "26/06;12:55;16:15;16:30;17:45", "27/06;12:30;15:15;16:30;18:45", "29/06;12:55;15:45;16:00;17:45", "30/06;12:55;16:15;16:30;17:45",
    ],
  },
  {
    nome: "Claudia Jaqueline Machado Gomes",
    empresa: "CDA Ensino Fundamental",
    linhas: [
      "01/06;12:55;14:30;14:45;17:45", "02/06;12:55;15:29;15:44;17:45", "03/06;12:55;17:03;17:18;17:45", "08/06;12:55;14:42;14:57;17:50", "09/06;12:55;15:30;15:45;17:48", "10/06;12:55;17:05;17:20;17:50", "11/06;12:55;13:46;14:01;17:46", "12/06;12:55;17:11;17:26;17:45", "13/06;08:00;10:18;;", "15/06;12:55;14:36;14:50;17:45", "16/06;12:55;15:26;15:42;17:45", "17/06;12:55;16:35;16:50;17:45", "18/06;12:55;15:51;16:07;17:47", "19/06;12:55;17:04;17:19;17:43", "22/06;12:55;14:30;14:45;17:45", "23/06;12:55;15:30;15:46;17:45", "24/06;12:55;16:42;16:57;17:45", "25/06;12:55;13:45;14:00;17:45", "26/06;12:55;17:05;17:20;17:45", "27/06;12:35;15:30;15:50;18:45", "29/06;12:55;14:30;14:48;17:51", "30/06;12:55;15:28;15:44;17:45",
    ],
  },
];

async function main() {
  console.log("Limpando dados existentes...");
  await prisma.logAtividade.deleteMany();
  await prisma.nota.deleteMany();
  await prisma.disciplina.deleteMany();
  await prisma.pagamento.deleteMany();
  await prisma.mensalidade.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.controleMaterial.deleteMany();
  await prisma.matricula.deleteMany();
  await prisma.responsavel.deleteMany();
  await prisma.aluno.deleteMany();
  await prisma.turma.deleteMany();
  await prisma.anoLetivo.deleteMany();
  await prisma.ferias.deleteMany();
  await prisma.registroPonto.deleteMany();
  await prisma.documentoFuncionario.deleteMany();
  await prisma.funcionario.deleteMany();
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.itemEstoque.deleteMany();
  await prisma.muralAviso.deleteMany();
  await prisma.emprestimoChave.deleteMany();
  await prisma.chave.deleteMany();
  await prisma.cardapio.deleteMany();
  await prisma.documento.deleteMany();
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
  const anoLetivo = await prisma.anoLetivo.create({ data: { ano: ANO, ativo: true } });

  const LABEL_TURNO: Record<AlunoReal["turno"], string> = { INTEGRAL: "Integral", MANHA: "Manhã", TARDE: "Tarde" };

  console.log("Criando turmas, alunos, responsáveis e matrículas reais...");
  for (const grupo of TURMAS_ALUNOS) {
    const turmasPorTurno = new Map<Turno, Awaited<ReturnType<typeof prisma.turma.create>>>();

    for (const alunoReal of grupo.alunos) {
      let turma = turmasPorTurno.get(Turno[alunoReal.turno]);
      if (!turma) {
        turma = await prisma.turma.create({
          data: {
            nome: `${grupo.turma} - ${LABEL_TURNO[alunoReal.turno]}`,
            turno: Turno[alunoReal.turno],
            capacidade: grupo.capacidade,
            anoLetivoId: anoLetivo.id,
          },
        });
        turmasPorTurno.set(Turno[alunoReal.turno], turma);
      }

      const aluno = await prisma.aluno.create({
        data: {
          nome: alunoReal.nome,
          dataNascimento: new Date(alunoReal.nascimento),
          responsaveis: alunoReal.respNome
            ? {
                create: [
                  {
                    nome: alunoReal.respNome,
                    parentesco: "Responsável",
                    cpf: alunoReal.respCpf ?? null,
                    telefone: alunoReal.respTelefone ?? "Não informado",
                    email: alunoReal.respEmail ?? null,
                    autorizado: true,
                  },
                ],
              }
            : undefined,
        },
      });

      const matricula = await prisma.matricula.create({
        data: {
          alunoId: aluno.id,
          turmaId: turma.id,
          anoLetivoId: anoLetivo.id,
          situacao: "ATIVA",
          dataMatricula: alunoReal.dataMatricula ? new Date(alunoReal.dataMatricula) : undefined,
        },
      });

      if (!alunoReal.semMensalidadeAinda) {
        const dataVencimento = new Date(ANO, MES_ATUAL - 1, 10);
        const mensalidade = await prisma.mensalidade.create({
          data: {
            matriculaId: matricula.id,
            mes: MES_ATUAL,
            ano: ANO,
            valor: alunoReal.mensalidade,
            vencimento: dataVencimento,
            situacao: alunoReal.mensalidadeJulPaga ? "PAGA" : "PENDENTE",
          },
        });
        if (alunoReal.mensalidadeJulPaga) {
          await prisma.pagamento.create({
            data: { mensalidadeId: mensalidade.id, valor: alunoReal.mensalidade, dataPagamento: dataVencimento, formaPagamento: FormaPagamento.BOLETO },
          });
        }
      }

      const controle = CONTROLE_MATERIAL_SEED.find(
        (c) => c.turma === grupo.turma && alunoReal.nome.toLowerCase().includes(c.nomeContem.toLowerCase())
      );
      if (controle) {
        await prisma.controleMaterial.create({
          data: {
            matriculaId: matricula.id,
            itensFaltantes: controle.itensFaltantes ?? null,
            trouxe: controle.trouxe ?? false,
            prazoReenvio: controle.prazoReenvio ? new Date(controle.prazoReenvio) : null,
          },
        });
      }
    }

    if (grupo.alunos.length === 0) {
      // Turma existe mas ainda sem matrícula (ex.: Contraturno, que é sempre pela manhã).
      await prisma.turma.create({ data: { nome: grupo.turma, turno: Turno.MANHA, capacidade: grupo.capacidade, anoLetivoId: anoLetivo.id } });
    }
  }

  console.log("Criando funcionários reais...");
  const funcionarioPorNomeEmpresa = new Map<string, Awaited<ReturnType<typeof prisma.funcionario.create>>>();
  for (const f of FUNCIONARIOS_REAIS) {
    const criado = await prisma.funcionario.create({
      data: {
        nome: f.nome,
        cpf: null,
        cargo: f.cargo,
        setor: setorPorCargo(f.cargo),
        empresa: f.empresa,
        admissao: new Date(f.admissao),
        valeTransporte: f.valeTransporte,
        ativo: true,
      },
    });
    funcionarioPorNomeEmpresa.set(`${f.nome}|${f.empresa}`, criado);
  }

  console.log("Importando ponto manual real (folha de ponto em papel de Junho/2026)...");
  for (const grupo of PONTO_MANUAL) {
    const funcionario = funcionarioPorNomeEmpresa.get(`${grupo.nome}|${grupo.empresa}`);
    if (!funcionario) continue;

    for (const linha of grupo.linhas) {
      const [dataStr, e1, s1, e2, s2] = linha.split(";");
      const [dia, mes] = dataStr.split("/").map(Number);
      await prisma.registroPonto.create({
        data: {
          funcionarioId: funcionario.id,
          data: new Date(Date.UTC(ANO, mes - 1, dia)),
          entrada1: e1 || null,
          saida1: s1 || null,
          entrada2: e2 || null,
          saida2: s2 || null,
          minutosPrevistos: 0,
          minutosTrabalhados: minutosTrabalhados(e1, s1, e2, s2),
          ocorrencia: PontoOcorrencia.NORMAL,
        },
      });
    }
  }

  console.log("Criando documentos institucionais...");
  await prisma.documento.createMany({
    data: DOCUMENTOS_SEED.map((d) => ({ ...d, origem: "Google Drive" })),
  });

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
      { titulo: "Reunião de pais - 3º Trimestre", conteudo: "Reunião de pais e mestres marcada para o dia 25/07, às 19h, no auditório.", autor: "Direção CDA", fixado: true },
      { titulo: "Campanha do agasalho", conteudo: "Estamos arrecadando agasalhos até o fim do mês. Ponto de coleta na secretaria.", autor: "Secretaria CDA", fixado: false },
    ],
  });

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
