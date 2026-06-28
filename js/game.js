/*
  game.js
  게임 규칙과 동작을 담당하는 파일입니다.
  밸런스를 바꾸고 싶으면 아래 '게임 기본 설정 / 게임 밸런스 설정' 구역의 숫자만 수정하세요.
*/

const board = document.getElementById("board");
const dialog = document.getElementById("dialog");
const nextBtn = document.getElementById("nextBtn");
const overlay = document.getElementById("overlay");
const dog = document.getElementById("dog");
const dogSprite = document.getElementById("dogSprite");
const bar = document.getElementById("bar");
const levelText = document.getElementById("levelText");
const timeText = document.getElementById("timeText");

const coverScreen = document.getElementById("coverScreen");
coverScreen.addEventListener("click", () => {
  coverScreen.classList.add("hidden");
});


// =========================
// 게임 기본 설정
// 이 구역의 숫자만 바꾸면 밸런스를 쉽게 조정할 수 있습니다.
// =========================

// 한 레벨의 전체 시간(초)
const TOTAL_TIME = 15;

// 시계가 틀어질 수 있는 각도. 180도는 헷갈려서 제외했습니다.
const angles = [45, 90, 135, 225, 270, 315];

// =========================
// 게임 밸런스 설정
// =========================

// 강민재가 시계 쪽으로 갔지만 실제로는 공격하지 않는 확률
// 0.15 = 평균 약 6~7번 중 1번
const FAKE_MOVE_CHANCE = 0.15;

// Level 1 기준 강민재 공격 대기 시간
// 700~1300ms 사이에서 랜덤하게 움직입니다.
const DOG_ATTACK_BASE_MIN = 700;
const DOG_ATTACK_BASE_RANDOM = 600;

// 레벨이 오를수록 강민재가 빨라지는 정도
// 현재 값은 '기존 Level20 난이도 ≒ 새 Level10 난이도' 기준입니다.
const DOG_SPEED_INCREASE_PER_LEVEL = 1.0556 / 9;

// 강민재 이동 시간
const DOG_MOVE_BASE_TIME = 380;
const DOG_MOVE_MIN_TIME = 180;

// 종료 직전 강민재 정지 타이밍
const DOG_STOP_LEVEL1 = 1.5;
const DOG_STOP_DECREASE_PER_LEVEL = 0.56 / 9;
const DOG_STOP_MIN = 0.7;

// 시계 흔들림 시간(ms)
const WATCH_SHAKE_TIME = 300;

// 레벨 시작 문구가 떠 있는 시간(ms)
const LEVEL_START_MESSAGE_TIME = 1100;

// =========================
// 강민재 플레이용 스프라이트 설정
// =========================
const DOG_SPRITES = {
  leftJump: "image/dog_left_jump.png",
  rightJump: "image/dog_right_jump.png",
  leftStop: "image/dog_left_stop.png",
  rightStop: "image/dog_right_stop.png",
  leftAttack: "image/dog_left_attack.png",
  rightAttack: "image/dog_right_attack.png"
};

// 이동 전/공격 전 잠깐 멈춰 보이는 시간(ms)
const DOG_STOP_POSE_TIME = 90;

// 공격 자세가 보이는 시간(ms)
const DOG_ATTACK_POSE_TIME = 130;

// 시계 옆 어느 쪽에 도착할지 랜덤으로 정할 때 쓰는 거리(px)
const DOG_ATTACK_SIDE_OFFSET = 42;

// 위로 이동할 때 강민재를 살짝 기울이는 각도
const DOG_UP_TILT_DEG = -12;


// =========================
// 계산 함수
// 아래 함수들은 위 설정값을 이용해 실제 값을 계산합니다.
// 보통은 수정하지 않아도 됩니다.
// =========================

function getDogSpeedMultiplier(){
  return 1 + (level - 1) * DOG_SPEED_INCREASE_PER_LEVEL;
}

function getDogAttackDelay(){
  const baseDelay = DOG_ATTACK_BASE_MIN + Math.random() * DOG_ATTACK_BASE_RANDOM;
  return baseDelay / getDogSpeedMultiplier();
}

function getDogStopTime(){
  return Math.max(
    DOG_STOP_LEVEL1 - (level - 1) * DOG_STOP_DECREASE_PER_LEVEL,
    DOG_STOP_MIN
  );
}

const introDialogs = [
  {speaker:"강민재", text:"결벽증이 아니라고요?"},
  {speaker:null, text:"강민재는 시계 수납장을 열어서 보란 듯이 시계들을 여러 방향으로 돌리기 시작했다."},
  {speaker:null, text:"이 무질서를 참을 수가 없어졌다."}
];

let introIndex = 0;
let level = 1;
let timeLeft = TOTAL_TIME;
let gameRunning = false;
let dogActive = false;
let watches = [];
let timerId = null;
let dogTimeoutId = null;
let attackToken = 0;

// =========================
// 대화 타이핑 설정
// =========================
const TYPE_SPEED = 35; // 숫자가 작을수록 글자가 빨리 나타납니다.
let typingTimerId = null;
let isTyping = false;
let currentFullText = "";
let currentTextElement = null;
let currentFeetElement = null;

function createBoard(){
  board.innerHTML = "";
  watches = [];
  for(let i=0; i<12; i++){
    const w = document.createElement("div");
    w.className = "watch";
    w.textContent = "⌚";
    w.dataset.rot = "0";
    w.addEventListener("click", () => {
      if(!gameRunning) return;

      const current = Number(w.dataset.rot);
      if(current === 0){
        // 이미 정방향인 시계를 잘못 클릭하면 랜덤으로 틀어짐
        const mistakeRot = angles[Math.floor(Math.random() * angles.length)];
        setWatchRotation(w, mistakeRot);
        w.classList.add("hit");
        setTimeout(() => w.classList.remove("hit"), WATCH_SHAKE_TIME);
      }else{
        // 틀어진 시계를 클릭하면 즉시 정방향 복구
        setWatchRotation(w, 0);
      }
    });
    board.appendChild(w);
    watches.push(w);
  }
}

function setWatchRotation(w, deg){
  w.dataset.rot = String(deg);
  w.style.transform = `rotate(${deg}deg)`;
}


function clearTypingTimer(){
  if(typingTimerId){
    clearInterval(typingTimerId);
    typingTimerId = null;
  }
}

function startTyping(text, textElement, feetElement){
  clearTypingTimer();

  currentFullText = text;
  currentTextElement = textElement;
  currentFeetElement = feetElement;
  isTyping = true;

  textElement.textContent = "";
  if(feetElement){
    feetElement.classList.remove("show");
  }

  let idx = 0;
  typingTimerId = setInterval(() => {
    idx++;
    textElement.textContent = text.slice(0, idx);

    if(idx >= text.length){
      finishTyping();
    }
  }, TYPE_SPEED);
}

function finishTyping(){
  clearTypingTimer();

  if(currentTextElement){
    currentTextElement.textContent = currentFullText;
  }

  isTyping = false;

  if(currentFeetElement){
    currentFeetElement.classList.add("show");
  }
}

function skipTyping(){
  finishTyping();
}

function showPlayingDialog(){
  // 게임 진행 중 기본 대화창: 아래쪽 시계를 가리지 않도록 클릭은 통과시킵니다.
  dialog.style.pointerEvents = "none";
  dialog.innerHTML=`
<div style="position:relative">
<img src="image/chatwindow_narration.png" style="width:100%;display:block;">
<div id="dialogText" class="dialogText">……</div>
<img class="nextFeet show" src="image/chatwindow_feet.png" alt="">
</div>`;
}

function showDoneDialog(){
  // 강민재가 시계 어지르기를 멈춘 뒤에도 아래쪽 시계를 클릭할 수 있게 합니다.
  dialog.style.pointerEvents = "none";
  dialog.innerHTML=`
<div style="position:relative">
<img src="image/chatwindow_narration.png" style="width:100%;display:block;">
<img src="image/dog_done.png" style="position:absolute;right:-4px;top:-100px;width:155px;">
<div id="dialogText" class="dialogText">……</div>
<img class="nextFeet show" src="image/chatwindow_feet.png" alt="">
</div>`;
}

function showIntro(){
  dialog.style.pointerEvents = "auto";
  const item = introDialogs[introIndex];

  if(item.speaker){
    dialog.innerHTML = `
      <div style="position:relative">
        <img src="image/chatwindow_speaking.png" style="width:100%;display:block;">
        <img src="image/dog_ha.png" style="position:absolute;right:-4px;top:-96px;width:145px;">
        <div class="speakerName">${item.speaker}</div>
        <div id="dialogText" class="dialogText speakingText"></div>
        <img id="nextFeet" class="nextFeet" src="image/chatwindow_feet.png" alt="">
      </div>`;
  }else{
    dialog.innerHTML = `
      <div style="position:relative">
        <img src="image/chatwindow_narration.png" style="width:100%;display:block;">
        <div id="dialogText" class="dialogText"></div>
        <img id="nextFeet" class="nextFeet" src="image/chatwindow_feet.png" alt="">
      </div>`;
  }

  clearTypingTimer();
  isTyping = false;
  const textEl = document.getElementById("dialogText");
  const feetEl = document.getElementById("nextFeet");
  startTyping(item.text, textEl, feetEl);

  nextBtn.textContent = introIndex === introDialogs.length - 1 ? "시작" : "다음";
}

function advanceIntro(){
  if(isTyping){
    skipTyping();
    return;
  }

  if(introIndex < introDialogs.length - 1){
    introIndex++;
    showIntro();
  }else{
    nextBtn.style.display = "none";
    showPlayingDialog();
    startLevel();
  }
}

nextBtn.addEventListener("click", advanceIntro);

dialog.addEventListener("click", () => {
  if(!gameRunning && nextBtn.style.display !== "none"){
    advanceIntro();
  }
});

function centerMessage(text, callback){
  overlay.classList.remove("hidden");
  overlay.innerHTML = `<div class="big">${text}</div>`;
  setTimeout(() => {
    overlay.classList.add("hidden");
    if(callback) callback();
  }, LEVEL_START_MESSAGE_TIME);
}

function updateHud(){
  levelText.textContent = `Level ${level}`;
  timeText.textContent = Math.max(timeLeft, 0).toFixed(1);

  const p = Math.max(timeLeft / TOTAL_TIME, 0);
  bar.style.height = (p * 100) + "%"; // 아래는 유지, 위쪽부터 비어감

  if(timeLeft <= 3) bar.style.background = "red";
  else if(timeLeft <= 7) bar.style.background = "gold";
  else bar.style.background = "limegreen";
}


function setDogSprite(name){
  if(!dogSprite) return;
  dogSprite.src = DOG_SPRITES[name];
}

function showActiveDog(){
  dog.style.display = "block";
}

function hideActiveDog(){
  dog.style.display = "none";
}


function getDogCenter(){
  const dogRect = dog.getBoundingClientRect();
  const gameRect = document.getElementById("game").getBoundingClientRect();
  return {
    x: dogRect.left - gameRect.left + dogRect.width / 2,
    y: dogRect.top - gameRect.top + dogRect.height / 2
  };
}

function getWatchCenter(target){
  const r = target.getBoundingClientRect();
  const g = document.getElementById("game").getBoundingClientRect();
  return {
    x: r.left - g.left + r.width / 2,
    y: r.top - g.top + r.height / 2
  };
}

function getMoveDirectionTo(target){
  const dogPos = getDogCenter();
  const watchPos = getWatchCenter(target);

  if(Math.abs(watchPos.x - dogPos.x) < 12){
    return Math.random() < 0.5 ? "left" : "right";
  }
  return watchPos.x >= dogPos.x ? "right" : "left";
}

function getArrivalSide(){
  return Math.random() < 0.5 ? "leftOfWatch" : "rightOfWatch";
}

function getAttackDirectionFromSide(side){
  // 시계 왼쪽에 도착하면 오른쪽을 보고 공격.
  // 시계 오른쪽에 도착하면 왼쪽을 보고 공격.
  return side === "leftOfWatch" ? "right" : "left";
}

function getDogTargetPosition(target, side){
  const r = target.getBoundingClientRect();
  const g = document.getElementById("game").getBoundingClientRect();

  const centerX = r.left - g.left + r.width / 2;
  const centerY = r.top - g.top + r.height / 2;

  const xOffset = side === "leftOfWatch" ? -DOG_ATTACK_SIDE_OFFSET : DOG_ATTACK_SIDE_OFFSET;

  return {
    left: centerX + xOffset - dog.offsetWidth / 2,
    top: centerY - dog.offsetHeight / 2
  };
}

function moveDogToWatchSide(target, side, moveDuration){
  const pos = getDogTargetPosition(target, side);
  dog.style.transition = `left ${moveDuration}ms linear, top ${moveDuration}ms linear, transform ${moveDuration}ms linear`;
  dog.style.left = pos.left + "px";
  dog.style.top = pos.top + "px";

  const current = getDogCenter();
  const watch = getWatchCenter(target);
  const movingUp = watch.y < current.y - 8;
  dog.style.transform = movingUp ? `rotate(${DOG_UP_TILT_DEG}deg)` : "rotate(0deg)";
}

function moveDogToWatch(target){
  const r = target.getBoundingClientRect();
  const g = document.getElementById("game").getBoundingClientRect();
  dog.style.left = (r.left - g.left + r.width * 0.5 - 16) + "px";
  dog.style.top = (r.top - g.top + r.height * 0.5 - 18) + "px";
}

function moveDogToSafeCorner(){
  const g = document.getElementById("game");
  const boardRect = board.getBoundingClientRect();
  const gameRect = g.getBoundingClientRect();

  setDogSprite("rightStop");
  dog.style.transform = "rotate(0deg)";

  // 시계판 바깥의 오른쪽 아래 구석으로 이동
  dog.style.left = (gameRect.width - 84) + "px";
  dog.style.top = (boardRect.bottom - gameRect.top + 8) + "px";
}

function getDogMoveDuration(){
  // 레벨이 오를수록 강민재 이동도 빨라짐
  // 너무 빨라져도 보이지 않으므로 최소 180ms는 유지
  return Math.max(DOG_MOVE_BASE_TIME / getDogSpeedMultiplier(), DOG_MOVE_MIN_TIME);
}

function scheduleDogAttack(){
  if(!gameRunning || !dogActive) return;
  dogTimeoutId = setTimeout(dogAttack, getDogAttackDelay());
}

function dogAttack(){
  if(!gameRunning || !dogActive) return;

  const myToken = ++attackToken;
  const w = watches[Math.floor(Math.random() * watches.length)];

  const totalInterval = getDogAttackDelay();
  const moveDirection = getMoveDirectionTo(w);
  const arrivalSide = getArrivalSide();
  const attackDirection = getAttackDirectionFromSide(arrivalSide);

  // 애니메이션 시간은 공격 간격 안에 포함시킵니다.
  // 즉, 강아지 그림이 추가되어도 실제 공격 속도는 이전 난이도와 같게 유지됩니다.
  const preStopTime = DOG_STOP_POSE_TIME;
  const attackPoseTime = DOG_ATTACK_POSE_TIME;
  const minMoveTime = 80;

  const moveDuration = Math.max(
    Math.min(getDogMoveDuration(), totalInterval - preStopTime - attackPoseTime),
    minMoveTime
  );

  const attackMoment = preStopTime + moveDuration;

  // 다음 공격은 지금 공격 연출이 다 끝난 뒤가 아니라,
  // 기존 공격 간격(totalInterval)에 맞춰 예약합니다.
  // 그래서 애니메이션 추가 전의 공격 템포가 유지됩니다.
  dogTimeoutId = setTimeout(() => {
    if(gameRunning && dogActive && myToken === attackToken){
      dogAttack();
    }
  }, totalInterval);

  // 이동 직전 아주 잠깐 멈춤 자세
  setDogSprite(moveDirection === "right" ? "rightStop" : "leftStop");

  setTimeout(() => {
    if(!gameRunning || !dogActive || myToken !== attackToken) return;

    // 이동 중 점프 자세
    setDogSprite(moveDirection === "right" ? "rightJump" : "leftJump");
    moveDogToWatchSide(w, arrivalSide, moveDuration);

  }, preStopTime);

  setTimeout(() => {
    if(!gameRunning || !dogActive || myToken !== attackToken) return;

    // 도착 후 공격 직전 정지 자세
    dog.style.transform = "rotate(0deg)";
    setDogSprite(attackDirection === "right" ? "rightStop" : "leftStop");

  }, Math.max(attackMoment - DOG_STOP_POSE_TIME, preStopTime));

  setTimeout(() => {
    if(!gameRunning || !dogActive || myToken !== attackToken) return;

    const isFakeMove = Math.random() < FAKE_MOVE_CHANCE;

    if(!isFakeMove){
      setDogSprite(attackDirection === "right" ? "rightAttack" : "leftAttack");

      const rot = angles[Math.floor(Math.random() * angles.length)];
      setWatchRotation(w, rot);

      w.classList.add("hit");
      setTimeout(() => w.classList.remove("hit"), WATCH_SHAKE_TIME);

      setTimeout(() => {
        if(!gameRunning || !dogActive || myToken !== attackToken) return;
        setDogSprite(attackDirection === "right" ? "rightStop" : "leftStop");
      }, attackPoseTime);
    }else{
      // 페이크 이동: 공격하지 않고 정지 자세만 보입니다.
      setDogSprite(attackDirection === "right" ? "rightStop" : "leftStop");
    }

  }, attackMoment);
}

function startLevel(){
  clearExistingTimers();
  createBoard();
  showPlayingDialog();
  levelText.textContent = `Level ${level}`;
  timeText.textContent = TOTAL_TIME.toFixed(1);
  moveDogToSafeCorner();

  centerMessage(`LEVEL ${level}\nSTART`, () => {
    timeLeft = TOTAL_TIME;
    gameRunning = true;
    dogActive = true;
    showActiveDog();
    updateHud();
    dogAttack();

    timerId = setInterval(() => {
      if(!gameRunning){
        clearExistingTimers();
        return;
      }

      timeLeft = Math.max(timeLeft - 0.1, 0);
      updateHud();

      if(timeLeft <= getDogStopTime() && dogActive){
        stopDogForFinalSeconds();
      }

      if(timeLeft <= 0){
        finishLevel();
      }
    }, 100);
  });
}

function stopDogForFinalSeconds(){
  dogActive = false;
  attackToken++;
  if(dogTimeoutId){
    clearTimeout(dogTimeoutId);
    dogTimeoutId = null;
  }

  // 시계 어지르기를 멈춘 시점부터 이동용 강민재는 숨기고,
  // 대화창 위의 dog_done.png를 보이게 합니다.
  hideActiveDog();
  showDoneDialog();
}

function clearExistingTimers(){
  if(timerId){
    clearInterval(timerId);
    timerId = null;
  }
  if(dogTimeoutId){
    clearTimeout(dogTimeoutId);
    dogTimeoutId = null;
  }
}

function finishLevel(){
  gameRunning = false;
  dogActive = false;
  hideActiveDog();
  clearExistingTimers();

  const isClear = watches.every(w => Number(w.dataset.rot) === 0);
  overlay.classList.remove("hidden");

  if(isClear){
    overlay.innerHTML = `
      <div class="big">CLEAR!</div>
      <div class="resultText">
        <b>&lt;차주한&gt;</b><br>
        내 방에 허락 없이 들어오지 마.<br>
        오늘 경고 ${level}회야.<br>
        경고 누적되면 강제 퇴거 조치할 거니까 기억해 둬.
      </div>
      <button onclick="nextLevel()">다음 레벨</button>
    `;
  }else{
    overlay.innerHTML = `
      <div class="big">FAIL...</div>
      <div class="resultText">
        <b>&lt;차주한&gt;</b><br>
        하아... 이 집에서 나가.
      </div>
      <button onclick="retryLevel()">다시 하기</button>
      <button onclick="restartGame()">처음으로 돌아가기</button>
    `;
  }
}

window.nextLevel = function(){
  level++;
  overlay.classList.add("hidden");
  startLevel();
};

window.retryLevel = function(){
  overlay.classList.add("hidden");
  startLevel();
};

window.restartGame = function(){
  clearExistingTimers();
  level = 1;
  introIndex = 0;
  gameRunning = false;
  dogActive = false;
  hideActiveDog();
  overlay.classList.add("hidden");
  nextBtn.style.display = "inline-block";
  dialog.style.pointerEvents = "auto";
  createBoard();
  updateHud();
  clearTypingTimer();
  isTyping = false;
  showIntro();
  moveDogToSafeCorner();
};

createBoard();
updateHud();
setTimeout(() => {
  showIntro();
}, 0);
moveDogToSafeCorner();
hideActiveDog();