/** 서울 열린데이터광장 realtimeStationArrival 응답의 원본 형태. */
export interface RawErrorMessage {
  status?: number;
  code?: string;
  message?: string;
  total?: number;
}

export interface RawArrival {
  subwayId?: string;
  updnLine?: string;
  trainLineNm?: string;
  statnNm?: string;
  /** 도착까지 남은 초(문자열). 상태에 따라 "0" 이 내려오며 이는 값 없음을 뜻합니다. */
  barvlDt?: string;
  /** 급행 여부 등 열차 종류. */
  btrainSttus?: string;
  /** 열차번호. */
  btrainNo?: string | null;
  /** 표시 문구 (예: "3분 30초 후 (신당)"). */
  arvlMsg2?: string;
  /** 열차의 현재 위치 역명. */
  arvlMsg3?: string;
  /** 도착 코드. */
  arvlCd?: string;
  /** 종착역. */
  bstatnNm?: string;
  recptnDt?: string;
}

export interface RawArrivalResponse {
  errorMessage?: RawErrorMessage;
  realtimeArrivalList?: RawArrival[];
  /** 인증 실패 등은 이 형태로도 내려옵니다. */
  status?: number;
  code?: string;
  message?: string;
}

/** realtimePosition 응답 한 행. updnLine 은 0 상행/내선, 1 하행/외선. trainSttus 는 0 진입, 1 도착, 2 출발, 3 전역출발. */
export interface RawPosition {
  subwayId?: string;
  subwayNm?: string;
  statnId?: string;
  statnNm?: string;
  trainNo?: string;
  lastRecptnDt?: string;
  recptnDt?: string;
  updnLine?: string;
  statnTid?: string;
  statnTnm?: string;
  trainSttus?: string;
  directAt?: string;
  lstcarAt?: string;
}

export interface RawPositionResponse {
  errorMessage?: RawErrorMessage;
  realtimePositionList?: RawPosition[];
  status?: number;
  code?: string;
  message?: string;
}
