/**
 * 수도권 전철 운행 계통 정의 — 노선 위상의 유일한 진실의 원천.
 *
 * `stations` 의 배열 순서가 전부입니다. 인접역·남은 정거장 수·방향은 모두
 * 이 순서에서 파생됩니다 (src/data/stations.ts 참고).
 *
 * 좌표는 여기 두지 않습니다. scripts/build-lines.mjs 가 station-coords.csv 에서
 * 이름으로 붙여 줍니다. 좌표가 없는 역은 GPS 보정만 비활성화되고 나머지는 정상 동작합니다.
 *
 * subwayId 는 서울 열린데이터광장 실시간 도착정보 API 의 노선 식별자입니다.
 * 지선 계통은 본선과 같은 노선으로 응답이 오므로 null 로 두고, 그룹의 본선이 대표합니다.
 */

/** @typedef {{id: string, name: string, subwayId: string|null, color: string, loop?: boolean, avgSecondsPerStation: number, note: string, realtime: boolean, groupId: string, badge: string, stations: string}} LineDef */

/** @type {LineDef[]} */
export const LINE_DEFS = [
  {
    id: '1', name: '1호선', subwayId: '1001', color: '#0052A4',
    avgSecondsPerStation: 130, realtime: true, groupId: '1', badge: '1',
    note: '경인선 본선 (소요산~인천).',
    stations: `소요산 동두천 보산 동두천중앙 지행 덕정 덕계 양주 녹양 가능 의정부 회룡 망월사
      도봉산 도봉 방학 창동 녹천 월계 광운대 석계 신이문 외대앞 회기 청량리 제기동 신설동 동묘앞
      동대문 종로5가 종로3가 종각 시청 서울역 남영 용산 노량진 대방 신길 영등포 신도림 구로
      구일 개봉 오류동 온수 역곡 소사 부천 중동 송내 부개 부평 백운 동암 간석 주안 도화 제물포
      도원 동인천 인천`,
  },
  {
    id: '1-gyeongbu', name: '1호선 경부·장항선', subwayId: null, color: '#0052A4',
    avgSecondsPerStation: 160, realtime: true, groupId: '1', badge: '1',
    note: '구로에서 갈라지는 경부·장항선 계통 (구로~신창).',
    stations: `구로 가산디지털단지 독산 금천구청 석수 관악 안양 명학 금정 군포 당정 의왕 성균관대
      화서 수원 세류 병점 세마 오산대 오산 진위 송탄 서정리 지제 평택 성환 직산 두정 천안 봉명
      쌍용 아산 배방 온양온천 신창`,
  },
  {
    id: '1-gwangmyeong', name: '1호선 광명셔틀', subwayId: null, color: '#0052A4',
    avgSecondsPerStation: 180, realtime: true, groupId: '1', badge: '1',
    note: '금천구청~광명 셔틀 구간.',
    stations: `금천구청 광명`,
  },
  {
    id: '1-seodongtan', name: '1호선 서동탄지선', subwayId: null, color: '#0052A4',
    avgSecondsPerStation: 180, realtime: true, groupId: '1', badge: '1',
    note: '병점~서동탄 지선.',
    stations: `병점 서동탄`,
  },
  {
    id: '2', name: '2호선', subwayId: '1002', color: '#00A84D', loop: true,
    avgSecondsPerStation: 105, realtime: true, groupId: '2', badge: '2',
    note: '본선 (순환선).',
    stations: `시청 을지로입구 을지로3가 을지로4가 동대문역사문화공원 신당 상왕십리 왕십리 한양대
      뚝섬 성수 건대입구 구의 강변 잠실나루 잠실 잠실새내 종합운동장 삼성 선릉 역삼 강남 교대 서초
      방배 사당 낙성대 서울대입구 봉천 신림 신대방 구로디지털단지 대림 신도림 문래 영등포구청 당산
      합정 홍대입구 신촌 이대 아현 충정로`,
  },
  {
    id: '2-seongsu', name: '2호선 성수지선', subwayId: null, color: '#00A84D',
    avgSecondsPerStation: 100, realtime: true, groupId: '2', badge: '2',
    note: '성수~신설동 지선.',
    stations: `성수 용답 신답 용두 신설동`,
  },
  {
    id: '2-sinjeong', name: '2호선 신정지선', subwayId: null, color: '#00A84D',
    avgSecondsPerStation: 100, realtime: true, groupId: '2', badge: '2',
    note: '신도림~까치산 지선.',
    stations: `신도림 도림천 양천구청 신정네거리 까치산`,
  },
  {
    id: '3', name: '3호선', subwayId: '1003', color: '#EF7C1C',
    avgSecondsPerStation: 115, realtime: true, groupId: '3', badge: '3',
    note: '대화~오금.',
    stations: `대화 주엽 정발산 마두 백석 대곡 화정 원당 원흥 삼송 지축 구파발 연신내 불광 녹번
      홍제 무악재 독립문 경복궁 안국 종로3가 을지로3가 충무로 동대입구 약수 금호 옥수 압구정 신사
      잠원 고속터미널 교대 남부터미널 양재 매봉 도곡 대치 학여울 대청 일원 수서 가락시장 경찰병원
      오금`,
  },
  {
    id: '4', name: '4호선', subwayId: '1004', color: '#00A5DE',
    avgSecondsPerStation: 120, realtime: true, groupId: '4', badge: '4',
    note: '진접~오이도 (진접선 포함).',
    stations: `진접 오남 별내별가람 당고개 상계 노원 창동 쌍문 수유 미아 미아사거리 길음
      성신여대입구 한성대입구 혜화 동대문 동대문역사문화공원 충무로 명동 회현 서울역 숙대입구
      삼각지 신용산 이촌 동작 총신대입구 사당 남태령 선바위 경마공원 대공원 과천 정부과천청사
      인덕원 평촌 범계 금정 산본 수리산 대야미 반월 상록수 한대앞 중앙 고잔 초지 안산 신길온천
      정왕 오이도`,
  },
  {
    id: '5', name: '5호선', subwayId: '1005', color: '#996CAC',
    avgSecondsPerStation: 110, realtime: true, groupId: '5', badge: '5',
    note: '방화~하남검단산.',
    stations: `방화 개화산 김포공항 송정 마곡 발산 우장산 화곡 까치산 신정 목동 오목교 양평
      영등포구청 영등포시장 신길 여의도 여의나루 마포 공덕 애오개 충정로 서대문 광화문 종로3가
      을지로4가 동대문역사문화공원 청구 신금호 행당 왕십리 마장 답십리 장한평 군자 아차산 광나루
      천호 강동 길동 굽은다리 명일 고덕 상일동 강일 미사 하남풍산 하남시청 하남검단산`,
  },
  {
    id: '5-macheon', name: '5호선 마천지선', subwayId: null, color: '#996CAC',
    avgSecondsPerStation: 110, realtime: true, groupId: '5', badge: '5',
    note: '강동~마천 지선.',
    stations: `강동 둔촌동 올림픽공원 방이 오금 개롱 거여 마천`,
  },
  {
    id: '6', name: '6호선', subwayId: '1006', color: '#CD7C2F',
    avgSecondsPerStation: 110, realtime: true, groupId: '6', badge: '6',
    note: '응암순환~신내. 응암순환 구간은 선형으로 단순화했습니다.',
    stations: `응암 역촌 불광 독바위 연신내 구산 새절 증산 디지털미디어시티 월드컵경기장 마포구청
      망원 합정 상수 광흥창 대흥 공덕 효창공원앞 삼각지 녹사평 이태원 한강진 버티고개 약수 청구
      신당 동묘앞 창신 보문 안암 고려대 월곡 상월곡 돌곶이 석계 태릉입구 화랑대 봉화산 신내`,
  },
  {
    id: '7', name: '7호선', subwayId: '1007', color: '#747F00',
    avgSecondsPerStation: 115, realtime: true, groupId: '7', badge: '7',
    note: '장암~석남.',
    stations: `장암 도봉산 수락산 마들 노원 중계 하계 공릉 태릉입구 먹골 중화 상봉 면목 사가정
      용마산 중곡 군자 어린이대공원 건대입구 뚝섬유원지 청담 강남구청 학동 논현 반포 고속터미널
      내방 이수 남성 숭실대입구 상도 장승배기 신대방삼거리 보라매 신풍 대림 남구로 가산디지털단지
      철산 광명사거리 천왕 온수 까치울 부천종합운동장 춘의 신중동 부천시청 상동 삼산체육관 굴포천
      부평구청 산곡 석남`,
  },
  {
    id: '8', name: '8호선', subwayId: '1008', color: '#E6186C',
    avgSecondsPerStation: 105, realtime: true, groupId: '8', badge: '8',
    note: '별내~모란 (별내선 포함).',
    stations: `별내 다산 동구릉 구리 장자호수공원 암사역사공원 암사 천호 강동구청 몽촌토성 잠실
      석촌 송파 가락시장 문정 장지 복정 산성 남한산성입구 단대오거리 신흥 수진 모란`,
  },
  {
    id: '9', name: '9호선', subwayId: '1009', color: '#BB8336',
    avgSecondsPerStation: 110, realtime: true, groupId: '9', badge: '9',
    note: '개화~중앙보훈병원. 급행 구분은 반영하지 않습니다.',
    stations: `개화 김포공항 공항시장 신방화 마곡나루 양천향교 가양 증미 등촌 염창 신목동 선유도
      당산 국회의사당 여의도 샛강 노량진 노들 흑석 동작 구반포 신반포 고속터미널 사평 신논현 언주
      선정릉 삼성중앙 봉은사 종합운동장 삼전 석촌고분 석촌 송파나루 한성백제 올림픽공원 둔촌오륜
      중앙보훈병원`,
  },
  {
    id: 'gyeongui', name: '경의중앙선', subwayId: '1063', color: '#77C4A3',
    avgSecondsPerStation: 155, realtime: true, groupId: 'gyeongui', badge: '경의',
    note: '임진강~지평. 문산~임진강은 셔틀 운행입니다.',
    stations: `임진강 문산 파주 월롱 금촌 금릉 운정 야당 탄현 일산 풍산 백마 곡산 대곡 능곡 행신
      강매 화전 수색 디지털미디어시티 가좌 홍대입구 서강대 공덕 효창공원앞 용산 이촌 서빙고 한남
      옥수 응봉 왕십리 청량리 회기 중랑 상봉 망우 양원 구리 도농 양정 덕소 도심 팔당 운길산 양수
      신원 국수 아신 오빈 양평 원덕 용문 지평`,
  },
  {
    id: 'gyeongui-seoul', name: '경의선 서울역지선', subwayId: null, color: '#77C4A3',
    avgSecondsPerStation: 150, realtime: true, groupId: 'gyeongui', badge: '경의',
    note: '가좌~서울역 지선.',
    stations: `가좌 신촌 서울역`,
  },
  {
    id: 'suin', name: '수인분당선', subwayId: '1075', color: '#F5A200',
    avgSecondsPerStation: 120, realtime: true, groupId: 'suin', badge: '수인',
    note: '청량리~인천.',
    stations: `청량리 왕십리 서울숲 압구정로데오 강남구청 선정릉 선릉 한티 도곡 구룡 개포동
      대모산입구 수서 복정 가천대 태평 모란 야탑 이매 서현 수내 정자 미금 오리 죽전 보정 구성
      신갈 기흥 상갈 청명 영통 망포 매탄권선 수원시청 매교 수원 고색 오목천 어천 야목 사리 한대앞
      중앙 고잔 초지 안산 신길온천 정왕 오이도 달월 월곶 소래포구 인천논현 호구포 남동인더스파크
      원인재 연수 송도 인하대 숭의 신포 인천`,
  },
  {
    id: 'sinbundang', name: '신분당선', subwayId: '1077', color: '#D4003B',
    avgSecondsPerStation: 130, realtime: true, groupId: 'sinbundang', badge: '신분',
    note: '신사~광교.',
    stations: `신사 논현 신논현 강남 양재 양재시민의숲 청계산입구 판교 정자 미금 동천 수지구청
      성복 상현 광교중앙 광교`,
  },
  {
    id: 'gyeongchun', name: '경춘선', subwayId: '1067', color: '#0C8E72',
    avgSecondsPerStation: 180, realtime: true, groupId: 'gyeongchun', badge: '경춘',
    note: '청량리~춘천. 일부 열차는 광운대에서 시종착합니다.',
    stations: `청량리 회기 중랑 상봉 망우 신내 갈매 별내 퇴계원 사릉 금곡 평내호평 천마산 마석
      대성리 청평 상천 가평 굴봉산 백양리 강촌 김유정 남춘천 춘천`,
  },
  {
    id: 'airport', name: '공항철도', subwayId: '1065', color: '#0090D2',
    avgSecondsPerStation: 190, realtime: true, groupId: 'airport', badge: '공항',
    note: '서울역~인천공항2터미널. 직통열차는 반영하지 않습니다.',
    stations: `서울역 공덕 홍대입구 디지털미디어시티 마곡나루 김포공항 계양 검암 청라국제도시 영종
      운서 공항화물청사 인천공항1터미널 인천공항2터미널`,
  },
  {
    id: 'gyeonggang', name: '경강선', subwayId: null, color: '#003DA5',
    avgSecondsPerStation: 210, realtime: false, groupId: 'gyeonggang', badge: '경강',
    note: '판교~여주.',
    stations: `판교 이매 삼동 경기광주 초월 곤지암 신둔도예촌 이천 부발 세종대왕릉 여주`,
  },
  {
    id: 'seohae', name: '서해선', subwayId: '1093', color: '#8FC31F',
    avgSecondsPerStation: 145, realtime: true, groupId: 'seohae', badge: '서해',
    note: '일산~원시 (대곡소사선 포함).',
    stations: `일산 풍산 백마 곡산 대곡 능곡 김포공항 원종 부천종합운동장 소사 소새울 시흥대야
      신천 신현 시흥시청 시흥능곡 달미 선부 초지 원곡 원시`,
  },
  {
    id: 'uisinseol', name: '우이신설선', subwayId: '1092', color: '#B7C452',
    avgSecondsPerStation: 90, realtime: true, groupId: 'uisinseol', badge: '우이',
    note: '북한산우이~신설동.',
    stations: `북한산우이 솔밭공원 419민주묘지 가오리 화계 삼양 삼양사거리 솔샘 북한산보국문 정릉
      성신여대입구 보문 신설동`,
  },
  {
    id: 'sillim', name: '신림선', subwayId: null, color: '#6789CA',
    avgSecondsPerStation: 85, realtime: false, groupId: 'sillim', badge: '신림',
    note: '샛강~관악산.',
    stations: `샛강 대방 서울지방병무청 보라매 보라매공원 보라매병원 당곡 신림 서원 서울대벤처타운
      관악산`,
  },
  {
    id: 'gimpo', name: '김포골드라인', subwayId: null, color: '#A17E46',
    avgSecondsPerStation: 100, realtime: false, groupId: 'gimpo', badge: '김포',
    note: '양촌~김포공항.',
    stations: `양촌 구래 마산 장기 운양 걸포북변 사우 풍무 고촌 김포공항`,
  },
  {
    id: 'incheon1', name: '인천1호선', subwayId: null, color: '#7CA8D5',
    avgSecondsPerStation: 100, realtime: false, groupId: 'incheon1', badge: 'I1',
    note: '계양~국제업무지구.',
    stations: `계양 귤현 박촌 임학 계산 경인교대입구 작전 갈산 부평구청 부평시장 부평 동수
      부평삼거리 간석오거리 인천시청 예술회관 인천터미널 문학경기장 선학 신연수 원인재 동춘 동막
      캠퍼스타운 테크노파크 지식정보단지 인천대입구 센트럴파크 국제업무지구`,
  },
  {
    id: 'incheon2', name: '인천2호선', subwayId: null, color: '#ED8B00',
    avgSecondsPerStation: 90, realtime: false, groupId: 'incheon2', badge: 'I2',
    note: '검단오류~운연.',
    stations: `검단오류 왕길 검단사거리 마전 완정 독정 검암 검바위 아시아드경기장 서구청 가정
      가정중앙시장 석남 서부여성회관 인천가좌 가재울 주안국가산단 주안 시민공원 석바위시장 인천시청
      석천사거리 모래내시장 만수 남동구청 인천대공원 운연`,
  },
  {
    id: 'uijeongbu', name: '의정부경전철', subwayId: null, color: '#FDA600',
    avgSecondsPerStation: 85, realtime: false, groupId: 'uijeongbu', badge: '의정',
    note: '발곡~탑석.',
    stations: `발곡 회룡 범골 경전철의정부 의정부시청 흥선 의정부중앙 동오 새말 경기도청북부청사
      효자 곤제 어룡 송산 탑석`,
  },
  {
    id: 'everline', name: '용인에버라인', subwayId: null, color: '#509F22',
    avgSecondsPerStation: 95, realtime: false, groupId: 'everline', badge: '에버',
    note: '기흥~전대.에버랜드.',
    stations: `기흥 강남대 지석 어정 동백 초당 삼가 시청.용인대 명지대 김량장 운동장.송담대 고진
      보평 둔전 전대.에버랜드`,
  },
  {
    id: 'gtxa-north', name: 'GTX-A 북부', subwayId: null, color: '#9A6292',
    avgSecondsPerStation: 240, realtime: false, groupId: 'gtxa', badge: 'A',
    note: '운정중앙~서울역. 서울역~수서는 미개통입니다.',
    stations: `운정중앙 킨텍스 대곡 연신내 서울역`,
  },
  {
    id: 'gtxa-south', name: 'GTX-A 남부', subwayId: null, color: '#9A6292',
    avgSecondsPerStation: 240, realtime: false, groupId: 'gtxa', badge: 'A',
    note: '수서~동탄. 서울역~수서는 미개통입니다.',
    stations: `수서 성남 구성 동탄`,
  },
];

/** 역명 별칭 — API 의 statnNm 이나 사용자 입력 표기가 다른 경우. */
export const ALIASES = {
  서울역: ['서울'],
  총신대입구: ['이수', '총신대입구(이수)'],
  '전대.에버랜드': ['전대에버랜드', '에버랜드'],
  '시청.용인대': ['시청용인대', '용인시청'],
  '운동장.송담대': ['운동장송담대'],
  '419민주묘지': ['4.19민주묘지', '사일구민주묘지'],
  올림픽공원: ['올림픽공원(한국체대)'],
};
