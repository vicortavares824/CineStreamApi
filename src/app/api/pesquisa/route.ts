import { NextResponse } from 'next/server';
import axios from 'axios';
import { BASE_SUPERFLIX_URL } from '../../../url';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'Parâmetro de busca "q" obrigatório.' }, { status: 400 });
  }

  // Busca na página de pesquisa do Superflix
  const url = `${BASE_SUPERFLIX_URL}/pesquisar/?paged=1&search=${encodeURIComponent(query)}`;
  let html = '';
  try {
    const resp = await axios.get(url);
    html = resp.data;
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao buscar dados do Superflix', detalhes: e instanceof Error ? e.message : e }, { status: 500 });
  }

  // Faz o parse do HTML e extrai as informações dos cards
  const $ = cheerio.load(html);
  const resultados: any[] = [];
  $('#contentList .poster').each((_, el) => {
    const img = $(el).find('img').attr('src') || '';
    const title = $(el).find('.title').text().trim();
    const tipo = $(el).find('.year').text().trim();
    let link = '';
    let tmdb = '';
    $(el).find('.hover .btn').each((_, btn) => {
      const dataCopy = $(btn).attr('data-copy');
      if (dataCopy && (dataCopy.startsWith(`${BASE_SUPERFLIX_URL}/filme/`) || dataCopy.startsWith(`${BASE_SUPERFLIX_URL}/serie/`))) {
        link = dataCopy;
        // Extrai apenas o ID do final do link
        tmdb = dataCopy.replace(`${BASE_SUPERFLIX_URL}/filme/`, '').replace(`${BASE_SUPERFLIX_URL}/serie/`, '');
      }
    });
    if (title && link) {
      resultados.push({ title, tipo, img, link, tmdb });
    }
  });

  if (resultados.length === 0) {
    return NextResponse.json({ error: 'Nenhum resultado encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ resultados });
}
