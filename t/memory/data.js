/* 우리의 기억 · 한 문제 = 한 카드
   fields.type: "ym" 년·월 고르기 | "text" 글 20자 (사람이 판정) | "pick" 나/상대 */
window.MEMORY = {
  series: "우리의 기억",
  path: "t/memory/",
  og: {
    wide: "https://bingari69-jpg.github.io/couple-test/og/og-memory.png",
    sq:   "https://bingari69-jpg.github.io/couple-test/og/og-memory-sq.png"
  },
  sets: {
    couple: { name:"커플 · 부부", emoji:"💕", desc:"우리가 같은 걸 기억하고 있을까" },
    friend: { name:"친구",        emoji:"🍻", desc:"우리 역사, 누가 더 잘 기억하나" }
  },
  /* 결과 공통 문구 */
  lines: {
    all:   "같은 기억. 이 장면은 둘 다 지웠다 쓴 적이 없습니다.",
    most:  "거의 같습니다. 다른 한 조각은 서로 채워주면 됩니다.",
    half:  "반은 같고 반은 다릅니다. 오늘 저녁 얘깃거리 생겼네요.",
    none:  "기억이 갈렸습니다. 둘 중 한 명이 더 로맨틱하게 재구성했습니다.",
    oneBlank: "한 명은 그날이 기억에 없습니다. 오늘부터 다시 만드세요.",
    bothBlank:"둘 다 기억이 없습니다. 그날은 없었던 걸로."
  },
  questions: [
    /* ---- 커플 ---- */
    { id:"kiss", set:"couple", emoji:"💋", title:"우리 첫 키스, 기억나?",
      hook:"나는 이미 답했어. 언제였고 어디였는지 적어봐.",
      fields:[ {key:"when", label:"언제였지?", type:"ym"}, {key:"where", label:"어디였지?", type:"text", ph:"예: 한강 차 안"} ] },
    { id:"date1", set:"couple", emoji:"🍝", title:"우리 첫 데이트, 기억나?",
      hook:"어디서 뭐 먹었는지. 나는 답했어.",
      fields:[ {key:"where", label:"어디였지?", type:"text", ph:"예: 홍대 파스타집"}, {key:"what", label:"뭐 먹었지?", type:"text", ph:"예: 까르보나라"} ] },
    { id:"gift", set:"couple", emoji:"🎁", title:"내가 처음 준 선물, 뭐였지?",
      hook:"기억나면 적어봐. 나는 답했어.",
      fields:[ {key:"what", label:"뭐였지?", type:"text", ph:"예: 목도리"} ] },
    { id:"love", set:"couple", emoji:"❤️", title:"먼저 사랑한다고 한 사람은?",
      hook:"나는 골랐어. 너는 누구라고 생각해?",
      fields:[ {key:"who", label:"누구였지?", type:"pick"} ],
      special:{ bothSelf:"둘 다 자기가 먼저 했다고 합니다. 한 명은 기억이 미화됐습니다.", bothOther:"둘 다 상대가 먼저였다고 합니다. 겸손한 건지 기억이 없는 건지." } },
    { id:"fight", set:"couple", emoji:"😡", title:"처음 크게 싸운 이유, 기억나?",
      hook:"나는 적었어. 너는 뭐 때문이었다고 기억해?",
      fields:[ {key:"why", label:"뭐 때문이었지?", type:"text", ph:"예: 연락 안 돼서"} ] },
    { id:"trip", set:"couple", emoji:"✈️", title:"우리 첫 여행, 어디였지?",
      hook:"나는 답했어. 어디였는지 적어봐.",
      fields:[ {key:"where", label:"어디였지?", type:"text", ph:"예: 강릉"}, {key:"when", label:"언제였지?", type:"ym"} ] },
    { id:"outfit", set:"couple", emoji:"👕", title:"처음 만난 날 내가 입은 옷, 기억나?",
      hook:"색이라도. 나는 답했어.",
      fields:[ {key:"what", label:"무슨 옷이었지?", type:"text", ph:"예: 검은 코트"} ] },
    { id:"parents", set:"couple", emoji:"👨‍👩‍👧", title:"상대 부모님 처음 뵌 날, 언제였지?",
      hook:"년도랑 달만이라도. 나는 답했어.",
      fields:[ {key:"when", label:"언제였지?", type:"ym"} ] },
    { id:"nick", set:"couple", emoji:"🏷️", title:"우리 사이 제일 오래된 별명은?",
      hook:"나는 적었어. 너는 뭐라고 기억해?",
      fields:[ {key:"what", label:"뭐였지?", type:"text", ph:"예: 곰돌이"} ] },
    { id:"photo", set:"couple", emoji:"📸", title:"첫 커플 사진, 어디서 찍었지?",
      hook:"나는 답했어. 어디였는지 적어봐.",
      fields:[ {key:"where", label:"어디서?", type:"text", ph:"예: 남산 케이블카"} ] },
    { id:"confess", set:"couple", emoji:"💌", title:"먼저 고백한 사람은?",
      hook:"나는 골랐어. 너는?",
      fields:[ {key:"who", label:"누구였지?", type:"pick"} ],
      special:{ bothSelf:"둘 다 자기가 고백했다고 합니다. 동시에 한 거면 인정.", bothOther:"둘 다 상대가 했다고 합니다. 그럼 누가 한 거죠." } },
    { id:"hand", set:"couple", emoji:"🤝", title:"처음 손잡은 곳, 기억나?",
      hook:"나는 답했어. 어디였는지.",
      fields:[ {key:"where", label:"어디였지?", type:"text", ph:"예: 영화관"} ] },

    /* ---- 친구 ---- */
    { id:"meet", set:"friend", emoji:"👋", title:"우리 처음 만난 계기, 기억나?",
      hook:"나는 적었어. 너는 어떻게 기억해?",
      fields:[ {key:"how", label:"어떻게 만났지?", type:"text", ph:"예: 1학년 같은 반"} ] },
    { id:"firstword", set:"friend", emoji:"💬", title:"네가 나한테 처음 한 말, 기억나?",
      hook:"나는 기억해. 너는?",
      fields:[ {key:"what", label:"뭐라고 했지?", type:"text", ph:"예: 펜 좀 빌려줘"} ] },
    { id:"drink", set:"friend", emoji:"🍻", title:"처음 같이 술 마신 날, 어디였지?",
      hook:"나는 답했어. 어디였는지 적어봐.",
      fields:[ {key:"where", label:"어디였지?", type:"text", ph:"예: 학교 앞 포차"} ] },
    { id:"contact", set:"friend", emoji:"📱", title:"먼저 연락한 사람은?",
      hook:"나는 골랐어. 너는?",
      fields:[ {key:"who", label:"누구였지?", type:"pick"} ],
      special:{ bothSelf:"둘 다 자기가 먼저 연락했다고 합니다. 한 명은 거짓말.", bothOther:"둘 다 상대라고 합니다. 그럼 어떻게 친해진 거죠." } },
    { id:"ffight", set:"friend", emoji:"🥊", title:"우리 제일 크게 싸운 이유, 기억나?",
      hook:"나는 적었어. 너는 뭐 때문이었다고 기억해?",
      fields:[ {key:"why", label:"뭐 때문이었지?", type:"text", ph:"예: 약속 펑크"} ] },
    { id:"ftrip", set:"friend", emoji:"🚗", title:"같이 간 첫 여행, 어디였지?",
      hook:"나는 답했어. 어디였는지.",
      fields:[ {key:"where", label:"어디였지?", type:"text", ph:"예: 부산"} ] }
  ]
};
