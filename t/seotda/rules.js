/* Three-card Seotda, basic ranks. The computer only receives its own cards and public bets. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Seotda = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const START = 100, ANTE = 5, ROUNDS = 5;
  const copy = value => JSON.parse(JSON.stringify(value));
  function deck() {
    return Array.from({length:20}, (_, id) => ({id, month:Math.floor(id / 2) + 1, bright:id % 2 === 0 && [1,3,8].includes(Math.floor(id / 2) + 1)}));
  }
  function shuffle(rng = Math.random) {
    const cards = deck();
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }
  function rank(cards) {
    if (!Array.isArray(cards) || cards.length !== 2 || cards[0].id === cards[1].id) throw new Error('서로 다른 두 장이 필요합니다.');
    const [a,b] = cards.slice().sort((x,y) => x.month - y.month);
    if (a.bright && b.bright) return {score:a.month === 3 && b.month === 8 ? 100 : 99, name:a.month + '' + b.month + '광땡', detail:'광 표시가 있는 ' + a.month + '월과 ' + b.month + '월 패예요.'};
    if (a.month === b.month) return {score:80 + a.month, name:a.month === 10 ? '장땡' : a.month + '땡', detail:'같은 ' + a.month + '월 두 장! 땡은 숫자가 클수록 강해요.'};
    const special = {'1,2':[69,'알리'],'1,4':[68,'독사'],'1,9':[67,'구삥'],'1,10':[66,'장삥'],'4,10':[65,'장사'],'4,6':[64,'세륙']};
    const combo = special[[a.month,b.month].join(',')];
    if (combo) return {score:combo[0], name:combo[1], detail:a.month + '월 + ' + b.month + '월, 숫자를 더하는 끗보다 센 특별한 조합이에요.'};
    const point = (a.month + b.month) % 10;
    return {score:point, name:point === 0 ? '망통' : point === 9 ? '갑오 · 9끗' : point + '끗', detail:a.month + ' + ' + b.month + ' = ' + (a.month + b.month) + '. 끝자리 ' + point + '로 겨뤄요.'};
  }
  function pair(cards, discard) { return cards.filter((_,i) => i !== discard); }
  function bestDiscard(cards) {
    let best = 0;
    for (let i = 1; i < 3; i++) if (rank(pair(cards,i)).score > rank(pair(cards,best)).score) best = i;
    return best;
  }
  function compare(left, right) { return Math.sign(rank(left).score - rank(right).score); }
  function create() { return {phase:'lobby', round:0, banks:[START,START], history:[]}; }
  function over(s) { return s.round >= ROUNDS || s.banks.some(n => n === 0); }
  function next(s, rng = Math.random) {
    if (!(s.phase === 'lobby' || (s.phase === 'result' && !over(s)))) return s;
    const n = copy(s), cards = shuffle(rng), ante = Math.min(ANTE, ...n.banks);
    n.round++; n.phase = 'discard'; n.startBanks = n.banks.slice();
    n.hands = [[cards[0],cards[2],cards[4]],[cards[1],cards[3],cards[5]]];
    n.discards = [-1,bestDiscard(n.hands[1])]; n.bets = [ante,ante];
    n.banks = n.banks.map(b => b - ante); n.pot = ante * 2;
    n.cap = Math.min(...n.startBanks); n.result = null; n.botLine = '세 장 중 어떤 한 장을 버릴까?';
    return n;
  }
  function discard(s, index) {
    if (s.phase !== 'discard' || !Number.isInteger(index) || index < 0 || index > 2) return s;
    const n = copy(s); n.discards[0] = index; return n;
  }
  function confirm(s) {
    if (s.phase !== 'discard' || s.discards[0] < 0) return s;
    const n = copy(s); n.phase = 'bet'; n.botLine = '난 한 장 골랐어. 이제 승부해 볼까?'; return n;
  }
  function pay(s, who, total) {
    const amount = total - s.bets[who];
    s.bets[who] = total; s.banks[who] -= amount; s.pot += amount;
  }
  function settle(s, winner, reason) {
    const pot = s.pot;
    if (winner === -1) { s.banks[0] += pot / 2; s.banks[1] += pot / 2; }
    else s.banks[winner] += pot;
    s.result = {winner, reason, pot, delta:s.banks[0] - s.startBanks[0]};
    s.phase = 'result'; s.pot = 0;
    s.history.push({round:s.round, ...s.result, player:rank(pair(s.hands[0],s.discards[0])).name, bot:rank(pair(s.hands[1],s.discards[1])).name});
    return s;
  }
  function showdown(s) {
    const c = compare(pair(s.hands[0],s.discards[0]), pair(s.hands[1],s.discards[1]));
    return settle(s, c === 0 ? -1 : c > 0 ? 0 : 1, 'showdown');
  }
  // This interface deliberately has no access to the player's private hand.
  function botAction(ownPair, publicBet, ante, cap, rng = Math.random) {
    const score = rank(ownPair).score, roll = rng();
    const pressure = (publicBet - ante) / Math.max(1,cap - ante);
    if (publicBet > ante && score < 64 && roll < (score < 5 ? .30 : .12) + pressure * .25) return {type:'fold'};
    if (publicBet < cap && ((score >= 64 && roll < .7) || (score >= 7 && roll < .35) || roll > .9)) {
      return {type:'raise', total:Math.min(cap, publicBet + Math.max(10,Math.ceil(publicBet / 2)))};
    }
    return {type:'call'};
  }
  function bet(s, total, rng = Math.random) {
    if (s.phase !== 'bet' || !Number.isInteger(total) || total < s.bets[0] || total > s.cap) return s;
    const n = copy(s), ante = n.bets[1]; pay(n,0,total);
    const choice = botAction(pair(n.hands[1],n.discards[1]),total,ante,n.cap,rng);
    if (choice.type === 'fold') { n.botLine = '이번 패는 자신 없어. 다이!'; return settle(n,0,'bot-fold'); }
    if (choice.type === 'raise') {
      pay(n,1,choice.total); n.phase = 'response'; n.botLine = '나는 ' + (choice.total - total) + '칩 더! 따라올래?'; return n;
    }
    pay(n,1,total); n.botLine = total === ante ? '좋아, 바로 패를 열자!' : '콜! 나도 따라갈게.';
    return showdown(n);
  }
  function respond(s, action) {
    if (s.phase !== 'response' || !['call','fold'].includes(action)) return s;
    const n = copy(s);
    if (action === 'fold') return settle(n,1,'player-fold');
    pay(n,0,n.bets[1]); return showdown(n);
  }
  function fold(s) {
    if (s.phase !== 'bet') return s;
    return settle(copy(s),1,'player-fold');
  }
  return {START,ANTE,ROUNDS,deck,shuffle,rank,pair,bestDiscard,compare,create,over,next,discard,confirm,botAction,bet,respond,fold};
});
