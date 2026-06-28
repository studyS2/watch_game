[너희들은 변호됐다] 팬게임 ~나는 결벽증이 아니야~

폴더 구조
- index.html : 게임 실행 파일
- css/style.css : 화면 디자인
- js/game.js : 게임 동작/규칙
- image/ : 이미지 파일을 넣는 폴더
- sound/ : 효과음/배경음악 파일을 넣는 폴더
- font/ : 웹폰트 파일을 넣는 폴더

현재 필요한 이미지 파일명
image/background.png
image/chatwindow_narration.png
image/chatwindow_speaking.png
image/chatwindow_feet.png
image/dog_ha.png
image/dog_done.png
image/cover.png   (표지 완성 후 추가)

실행 방법
1. 이 압축을 풉니다.
2. image 폴더 안에 위 이미지 파일들을 넣습니다.
3. index.html을 더블클릭해서 실행합니다.

주의
- 파일명은 대소문자까지 정확히 맞춰야 합니다.
- 이미지 파일이 없으면 해당 이미지는 깨져 보일 수 있습니다.


추가된 강민재 플레이용 이미지
image/dog_left_jump.png
image/dog_right_jump.png
image/dog_left_stop.png
image/dog_right_stop.png
image/dog_left_attack.png
image/dog_right_attack.png


v4.3 변경사항
- 강민재 스프라이트 애니메이션이 추가되어도 공격 속도/난이도가 변하지 않도록 수정했습니다.
- 정지 포즈, 점프 포즈, 공격 포즈는 기존 공격 간격 안에서 재생됩니다.


v4.4 변경사항
- 레벨 시작/재시작 시에는 dog_done.png 없이 "……" 대화창만 표시됩니다.
- 강민재가 종료 직전 시계 어지르기를 멈춘 시점부터 dog_done.png가 표시됩니다.
- 실패 후 다시 하기/다음 레벨 시작 시 dog_done.png가 사라지도록 수정했습니다.


v4.5 변경사항
- font/Pretendard-SemiBold.woff2: 말하는 사람 이름에 적용
- font/DungGeunMo.woff2: 대사/나래이션에 적용
- START/CLEAR/FAIL/버튼 폰트는 아직 변경하지 않음
