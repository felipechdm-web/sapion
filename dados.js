/* =====================================================================
   DADOS EDITÁVEIS DA APRESENTAÇÃO
   ---------------------------------------------------------------------
   Cases no Ideb (slide 16). Preencha a série de cada município com o
   Ideb da REDE MUNICIPAL nos ANOS INICIAIS do Ensino Fundamental
   (fonte oficial: Inep). Use ponto como separador decimal: 6.8
   Enquanto um valor estiver como null, o gráfico mostra um marcador
   pontilhado "a inserir" no lugar do número.
   Depois de editar, rode build.ps1 para atualizar o arquivo único.
   ===================================================================== */
window.IDEB_CASOS = [
  {
    municipio: 'São Roque do Canaã',
    selo: 'Cliente há +5 anos',
    seloTipo: 'client',
    serie: { 2021: null, 2023: null, 2025: null },
    destaque: 'EMEIEF Josephir Boschetti: <b>8,9</b> no Ideb 2025, entre as quatro melhores escolas do ES nos anos iniciais.'
  },
  {
    municipio: 'Marilândia',
    selo: 'Pódio estadual',
    seloTipo: 'podium',
    serie: { 2021: null, 2023: null, 2025: null },
    destaque: 'EMEIEFTI Ângelo Bravin: <b>9,7</b>, a melhor nota do ES nos anos iniciais no Ideb 2025.'
  },
  {
    municipio: 'Águia Branca',
    selo: 'Pódio estadual',
    seloTipo: 'podium',
    serie: { 2021: null, 2023: null, 2025: null },
    destaque: 'Divide com Marilândia o pódio estadual dos anos iniciais do Ensino Fundamental.'
  }
];
