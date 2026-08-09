type TmdbMovie = { id: number; title?: string; name?: string; release_date?: string; first_air_date?: string };

// TMDB data is intentionally framed as a nudge: its provider catalogues can lag regional availability.
export async function upcomingTitlesForService(serviceName: string, region = 'IN') {
  const key = process.env.TMDB_API_KEY;
  if (!key) return [] as string[];
  const providerMap: Record<string, string> = { netflix: 'Netflix', 'amazon prime': 'Amazon Prime Video', prime: 'Amazon Prime Video', 'youtube premium': 'YouTube Premium', 'disney+': 'Disney Plus', 'hotstar': 'Hotstar' };
  const provider = providerMap[serviceName.toLowerCase()];
  if (!provider) return [];
  const upcoming = await fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${key}&region=${region}`, { next: { revalidate: 86400 } });
  if (!upcoming.ok) return [];
  const movies = ((await upcoming.json()).results ?? []) as TmdbMovie[];
  // Watch-provider availability is title-specific. This is a bounded, best-effort confirmation.
  const results: string[] = [];
  for (const movie of movies.slice(0, 10)) {
    const providers = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${key}`, { next: { revalidate: 86400 } });
    if (!providers.ok) continue;
    const regionData = (await providers.json()).results?.[region];
    const available = [...(regionData?.flatrate ?? []), ...(regionData?.rent ?? []), ...(regionData?.buy ?? [])].some((p: { provider_name: string }) => p.provider_name === provider);
    if (available && (movie.title || movie.name)) results.push(movie.title || movie.name!);
    if (results.length === 3) break;
  }
  return results;
}
