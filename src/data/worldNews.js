// Curated real-world context for the alternate-history promotion timeline.
// Headlines rotate through the terminal during the year and collect in the annual recap.
const WORLD_BY_YEAR = {
  1996: { president: 'Bill Clinton', movie: 'Independence Day', album: 'Falling into You — Celine Dion', nba: 'Chicago Bulls', nfl: 'Dallas Cowboys' },
  1997: { president: 'Bill Clinton', movie: 'Titanic', album: 'Spice — Spice Girls', nba: 'Chicago Bulls', nfl: 'Green Bay Packers' },
  1998: { president: 'Bill Clinton', movie: 'Armageddon', album: 'Titanic soundtrack', nba: 'Chicago Bulls', nfl: 'Denver Broncos' },
  1999: { president: 'Bill Clinton', movie: 'Star Wars: Episode I', album: 'Millennium — Backstreet Boys', nba: 'San Antonio Spurs', nfl: 'Denver Broncos' },
  2000: { president: 'Bill Clinton', movie: 'Mission: Impossible 2', album: 'No Strings Attached — NSYNC', nba: 'Los Angeles Lakers', nfl: 'St. Louis Rams' },
  2001: { president: 'George W. Bush', movie: "Harry Potter and the Sorcerer's Stone", album: 'Hybrid Theory — Linkin Park', nba: 'Los Angeles Lakers', nfl: 'Baltimore Ravens' },
  2002: { president: 'George W. Bush', movie: 'The Lord of the Rings: The Two Towers', album: 'The Eminem Show — Eminem', nba: 'Los Angeles Lakers', nfl: 'New England Patriots' },
  2003: { president: 'George W. Bush', movie: 'The Lord of the Rings: The Return of the King', album: 'Get Rich or Die Tryin’ — 50 Cent', nba: 'San Antonio Spurs', nfl: 'Tampa Bay Buccaneers' },
  2004: { president: 'George W. Bush', movie: 'Shrek 2', album: 'Confessions — Usher', nba: 'Detroit Pistons', nfl: 'New England Patriots' },
  2005: { president: 'George W. Bush', movie: 'Harry Potter and the Goblet of Fire', album: 'The Emancipation of Mimi — Mariah Carey', nba: 'San Antonio Spurs', nfl: 'New England Patriots' },
  2006: { president: 'George W. Bush', movie: "Pirates of the Caribbean: Dead Man's Chest", album: 'High School Musical soundtrack', nba: 'Miami Heat', nfl: 'Pittsburgh Steelers' },
  2007: { president: 'George W. Bush', movie: "Pirates of the Caribbean: At World's End", album: 'High School Musical 2 soundtrack', nba: 'San Antonio Spurs', nfl: 'Indianapolis Colts' },
  2008: { president: 'George W. Bush', movie: 'Indiana Jones and the Kingdom of the Crystal Skull', album: 'Viva la Vida — Coldplay', nba: 'Boston Celtics', nfl: 'New York Giants' },
  2009: { president: 'Barack Obama', movie: 'Avatar', album: 'Fearless — Taylor Swift', nba: 'Los Angeles Lakers', nfl: 'Pittsburgh Steelers' },
  2010: { president: 'Barack Obama', movie: 'Toy Story 3', album: 'Recovery — Eminem', nba: 'Los Angeles Lakers', nfl: 'New Orleans Saints' },
  2011: { president: 'Barack Obama', movie: 'Harry Potter and the Deathly Hallows: Part 2', album: '21 — Adele', nba: 'Dallas Mavericks', nfl: 'Green Bay Packers' },
  2012: { president: 'Barack Obama', movie: 'The Avengers', album: '21 — Adele', nba: 'Miami Heat', nfl: 'New York Giants' },
  2013: { president: 'Barack Obama', movie: 'Frozen', album: 'Midnight Memories — One Direction', nba: 'Miami Heat', nfl: 'Baltimore Ravens' },
  2014: { president: 'Barack Obama', movie: 'Transformers: Age of Extinction', album: 'Frozen soundtrack', nba: 'San Antonio Spurs', nfl: 'Seattle Seahawks' },
  2015: { president: 'Barack Obama', movie: 'Star Wars: The Force Awakens', album: '25 — Adele', nba: 'Golden State Warriors', nfl: 'New England Patriots' },
  2016: { president: 'Barack Obama', movie: 'Captain America: Civil War', album: 'Lemonade — Beyoncé', nba: 'Cleveland Cavaliers', nfl: 'Denver Broncos' },
};

const fallback = year => ({
  president: year >= 2025 ? 'Donald Trump' : year >= 2021 ? 'Joe Biden' : year >= 2017 ? 'Donald Trump' : 'United States administration',
  movie: 'The year’s box-office leader',
  album: 'The year’s biggest-selling album',
  nba: 'NBA champions',
  nfl: 'Super Bowl champions',
});

export function worldSnapshot(year) {
  return { year, ...(WORLD_BY_YEAR[year] ?? fallback(year)) };
}

export function worldNewsForDate(date) {
  const current = new Date(`${date}T12:00:00`);
  const year = current.getFullYear();
  const month = current.getMonth() + 1;
  const world = worldSnapshot(year);
  const stories = [
    { kicker: 'WASHINGTON', headline: `${world.president.toUpperCase()} IN THE WHITE HOUSE`, body: `The political backdrop to the ${year} season.` },
  ];
  if (month <= 3) stories.push({ kicker: 'PRO FOOTBALL', headline: `${world.nfl.toUpperCase()} TAKE THE TITLE`, body: 'The Super Bowl result leads sports pages across the country.' });
  if (month >= 5) stories.push({ kicker: 'PRO BASKETBALL', headline: `${world.nba.toUpperCase()} RULE THE NBA`, body: 'The championship run sets the pace for the summer sports calendar.' });
  if (month >= 7) stories.push({ kicker: 'BOX OFFICE', headline: world.movie.toUpperCase(), body: `The defining theatrical hit of ${year}.` });
  if (month >= 9) stories.push({ kicker: 'MUSIC', headline: world.album.toUpperCase(), body: `One of ${year}’s biggest-selling records is everywhere.` });
  return stories.slice(-3);
}
