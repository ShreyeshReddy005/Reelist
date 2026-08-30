import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reelMapping = {
  "https://www.instagram.com/reel/valid_movie/": path.join(__dirname, "reel_valid_movie.json"),
  "https://www.instagram.com/reel/no_caption/": path.join(__dirname, "reel_no_caption.json"),
  "https://www.instagram.com/reel/scraper_fail/": path.join(__dirname, "reel_scraper_fail.json"),
  "https://www.instagram.com/reel/tmdb_fail/": path.join(__dirname, "reel_tmdb_fail.json")
};

export default reelMapping;
