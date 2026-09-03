# 원본 데이터셋 (scripts/data/raw)

서울교통공사가 공공데이터포털·서울 열린데이터광장에 공개한 파일을 **UTF-8 로 변환해** 그대로 둔 것입니다.
값은 손대지 않았고 인코딩(CP949 → UTF-8)과 BOM 제거, CRLF → LF 만 바꿨습니다.
`pnpm build-transfer-data` 와 `pnpm build-lines`, 백엔드의 `Ingest import` 가 이 파일들을 읽습니다.

| 파일 | 출처 | 갱신일 | 행 | 내용 |
|---|---|---|---|---|
| `transfer-guides.csv` | [서울교통공사_서울 도시철도 환승정보 (data.go.kr 15098252)](https://www.data.go.kr/data/15098252/fileData.do) | 2026-03-03 | 1,024 | 환승역별 최단 환승 경로: 하차 열차 방면, **하차위치(호차/문)**, 환승 열차 방면, 환승 승차위치, 소요시간(mm:ss). `All` 은 같은 승강장(아무 칸) |
| `transfer-walk-times.csv` | [서울교통공사_환승역거리 소요시간 정보 (data.go.kr 15044419)](https://www.data.go.kr/data/15044419/fileData.do) | 2025-12-31 | 145 | 호선, 환승역명, 환승노선, 환승거리(m), 환승소요시간(mm:ss, 보행 1.2 m/s 기준) |
| `timetable.csv.gz` | [서울교통공사_서울 도시철도 열차운행시각표 (data.go.kr 15098251)](https://www.data.go.kr/data/15098251/fileData.do) | 2026-06-16 | 424,264 | 1~9호선 전 구간 열차별 역별 도착/출발 시각. 주중주말 DAY/SAT/END, 방향 UP/DOWN(2호선 순환은 IN/OUT), 급행여부, 열차코드, 출발역/도착역. 24시 이후는 `24:xx:xx`, `25:xx:xx` 표기 |
| `segment-times.csv` | [서울교통공사 역간거리 및 소요시간_240810 (data.seoul.go.kr OA-12034)](https://data.seoul.go.kr/dataList/OA-12034/S/1/datasetView.do) | 2024-08-10 | 279 | 1~8호선 서울교통공사 운영 구간. 각 행의 소요시간(mm:ss)은 **직전 역에서 이 역까지** 표준 운행시간, 첫 역은 00:00 |
| `../station_code.raw.csv` | 공개 데이터 추출본 (기존) | — | 729 | 서울교통공사 역코드 · 외부코드 · 역명 · 좌표 |

## 다시 내려받기

브라우저 없이 받을 수 있습니다. 파일 식별자는 바뀔 수 있으니 안 되면 위 링크에서 직접 받아 같은 이름으로 넣으세요.

```bash
# data.go.kr 파일: fileData.do 페이지의 atchFileId 를 사용 (페이지 HTML 에서 grep 가능)
curl -sL -A Mozilla/5.0 -e https://www.data.go.kr/data/15098252/fileData.do \
  "https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003605050&fileDetailSn=1" -o guides.csv
# 서울 열린데이터광장 파일: POST 방식
curl -sL -A Mozilla/5.0 -X POST -d "infId=OA-12034&seq=9&infSeq=1" \
  "https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do" -o segments.csv
# 인코딩 정리
iconv -f cp949 -t utf-8 segments.csv | sed 's/\r$//' > segment-times.csv
```

원본 인코딩: 환승정보는 UTF-8(BOM), 나머지는 CP949 였습니다.

## 검증

```bash
pnpm fetch-datasets        # 파일 존재·헤더·행수 확인, 시각표 압축 해제본(timetable.unpacked.csv, git 제외) 생성
pnpm build-transfer-data   # → src/data/generated/*.json
pnpm verify-transfer-data
```

## 알려진 특성

- 환승정보의 `환승시작 호선` 은 1~9 는 숫자, 광역철도는 이름(경의선·수인분당선·공항철도 …)입니다. `환승종료역` 은 역코드가 아니라 **환승 열차가 향하는 다음 역의 코드**입니다 (예: 서울역 1→4호선 "숙대입구 방면" 은 `0427`=숙대입구). 그래서 생성기는 코드 대신 `… 방면` 역명을 `lines.json` 에서 찾아 노선과 방향을 정합니다.
- 역간거리 파일은 서울교통공사 운영 구간만 있어 1호선은 서울역~청량리 10개 역뿐입니다. 없는 구간은 노선 평균으로 폴백합니다.
- 시각표에는 도착시간 또는 출발시간이 비어 있는 행(시·종착)이 약 1.2만 건 있습니다.
