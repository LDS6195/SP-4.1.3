import './ui-lab.css';

const lab = document.querySelector('.lab');
const themeButtons = [...document.querySelectorAll('[data-theme]')].filter(element => element.tagName === 'BUTTON');
const rosterRows = [...document.querySelectorAll('[data-player]')];
const themeName = document.querySelector('#theme-name');
const themeNote = document.querySelector('#theme-note');
const mainMenuView = document.querySelector('#main-menu-view');
const rosterViews = [...document.querySelectorAll('.roster-view')];
const labScreenName = document.querySelector('#lab-screen-name');
const modeTitle = document.querySelector('.mode-title strong');
const contextStrip = document.querySelector('#context-strip');
let activeTheme = 'broadcast';
let activeView = 'menu';

const themes = {
  broadcast: {
    name: 'BROADCAST 05',
    note: 'Asymmetric 2K-era broadcast shell: angled menu slab, matchup feature, and live league wire.',
  },
  warroom: {
    name: 'FRANCHISE WAR ROOM',
    note: 'A horizontal executive briefing organized around decisions, workstreams, and club operations.',
  },
  night: {
    name: 'NETWORK NIGHT',
    note: 'A compact icon rail opens into a full-screen primetime matchup package with live scores.',
  },
};

const players = [
  { number: '12', name: 'MARCUS CARTER', height: `6'3"`, weight: '218', exp: '5 YRS', age: '28', college: 'Michigan State', status: 'HEALTHY', overall: '91' },
  { number: '7', name: 'TRE BISHOP', height: `6'1"`, weight: '212', exp: '2 YRS', age: '24', college: 'Louisville', status: 'HEALTHY', overall: '78' },
  { number: '16', name: 'ELI COLE', height: `6'4"`, weight: '225', exp: 'ROOKIE', age: '22', college: 'Iowa State', status: 'HEALTHY', overall: '69' },
];

function setTheme(theme) {
  activeTheme = theme;
  lab.dataset.theme = theme;
  themeButtons.forEach(button => {
    const isActive = button.dataset.theme === theme;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  themeName.textContent = themes[theme].name;
  themeNote.textContent = themes[theme].note;
  if (activeView === 'menu') focusActiveMenuItem();
}

function getVisibleMenuButtons() {
  return [...document.querySelectorAll(`.concept-${activeTheme} nav button`)];
}

function focusActiveMenuItem() {
  const buttons = getVisibleMenuButtons();
  const activeButton = buttons.find(button => button.classList.contains('active')) || buttons[0];
  activeButton?.focus({ preventScroll: true });
}

function selectMenuOffset(offset) {
  const buttons = getVisibleMenuButtons();
  const currentIndex = Math.max(0, buttons.findIndex(button => button.classList.contains('active')));
  const nextIndex = (currentIndex + offset + buttons.length) % buttons.length;
  buttons.forEach((button, index) => button.classList.toggle('active', index === nextIndex));
  buttons[nextIndex].focus({ preventScroll: true });
}

function openRoster() {
  activeView = 'roster';
  lab.classList.add('roster-mode');
  mainMenuView.hidden = true;
  rosterViews.forEach(view => { view.hidden = false; });
  labScreenName.textContent = 'Roster Screen / Preserved Concept';
  modeTitle.textContent = 'TEAM ROSTER';
  contextStrip.innerHTML = '<span>OFFENSE</span><b>QUARTERBACKS</b><span class="team-context">METROPOLITAN</span><strong>87 OVR</strong>';
  rosterRows[0].focus({ preventScroll: true });
}

function openMainMenu() {
  activeView = 'menu';
  lab.classList.remove('roster-mode');
  mainMenuView.hidden = false;
  rosterViews.forEach(view => { view.hidden = true; });
  labScreenName.textContent = 'Main Menu / Iteration 02';
  modeTitle.textContent = 'MAIN MENU';
  contextStrip.innerHTML = '<span>FRANCHISE</span><b>WEEK 7</b><span class="team-context">METROPOLITAN FOOTBALL CLUB</span><strong>5–1</strong>';
  focusActiveMenuItem();
}

function selectPlayer(index) {
  const player = players[index];
  rosterRows.forEach((row, rowIndex) => {
    row.classList.toggle('selected', rowIndex === index);
    row.setAttribute('aria-selected', String(rowIndex === index));
  });
  for (const [field, value] of Object.entries(player)) {
    document.querySelector(`#player-${field}`).textContent = value;
  }
  rosterRows[index].focus({ preventScroll: true });
}

themeButtons.forEach(button => button.addEventListener('click', () => setTheme(button.dataset.theme)));
rosterRows.forEach((row, index) => row.addEventListener('click', () => selectPlayer(index)));
document.querySelectorAll('.concept-menu nav button').forEach(button => button.addEventListener('click', () => {
  const siblings = [...button.closest('nav').querySelectorAll('button')];
  siblings.forEach(sibling => sibling.classList.toggle('active', sibling === button));
  if (button.dataset.route === 'roster') openRoster();
}));

addEventListener('keydown', event => {
  if (/Digit[1-3]/.test(event.code)) {
    setTheme(['broadcast', 'warroom', 'night'][Number(event.code.at(-1)) - 1]);
    if (activeView !== 'menu') openMainMenu();
    return;
  }
  if (event.code === 'Escape' && activeView === 'roster') {
    openMainMenu();
    event.preventDefault();
    return;
  }
  if (activeView === 'menu') {
    if (event.code === 'ArrowDown' || event.code === 'ArrowRight') selectMenuOffset(1);
    if (event.code === 'ArrowUp' || event.code === 'ArrowLeft') selectMenuOffset(-1);
    if (event.code === 'Enter' || event.code === 'Space') document.activeElement?.click();
    if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Enter', 'Space'].includes(event.code)) event.preventDefault();
    return;
  }
  const selectedIndex = rosterRows.findIndex(row => row.classList.contains('selected'));
  if (event.code === 'ArrowDown') selectPlayer((selectedIndex + 1) % rosterRows.length);
  if (event.code === 'ArrowUp') selectPlayer((selectedIndex - 1 + rosterRows.length) % rosterRows.length);
  if (['ArrowDown', 'ArrowUp'].includes(event.code)) event.preventDefault();
});

setTheme('broadcast');
openMainMenu();