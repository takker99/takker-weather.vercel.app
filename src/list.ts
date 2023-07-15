export interface WeatherMapList {
  /** 実況天気図のファイル名のリスト */ now: string[];
  /** 48時間予報図のファイル名 */ ft24: [string];
  /** 48時間予報図のファイル名 */ ft48: [string];
}
export interface WeatherMapListResponse {
  /** 日本周辺域のカラー天気図 */ near: WeatherMapList;
  // deno-lint-ignore camelcase
  /** 日本周辺域のモノクロ天気図 */ near_monochrome: WeatherMapList;
  /** 日本周辺域のカラー天気図 */ asia: WeatherMapList;
  // deno-lint-ignore camelcase
  /** 日本周辺域のモノクロ天気図 */ asia_monochrome: WeatherMapList;
}

/** 実況天気図と予報天気図のpathnamesを取得する */
export const fetchList = async (): Promise<WeatherMapListResponse> => {
  const res = await fetch(
    `https://www.jma.go.jp/bosai/weather_map/data/list.json`,
  );
  if (!res.ok) throw { status: res.status, body: await res.text() };

  return (await res.json()) as WeatherMapListResponse;
};

/** pathnameから公称観測日時を得る */
export const datetime = (listURL: string): Date | undefined => {
  const datetime = listURL.match(/_(\d{14})_/)?.[1];
  return !datetime ? undefined : new Date(
    Date.UTC(
      parseInt(datetime.slice(0, 4)),
      parseInt(datetime.slice(4, 6)) - 1,
      parseInt(datetime.slice(6, 8)),
      parseInt(datetime.slice(8, 10)),
      parseInt(datetime.slice(10, 12)),
      parseInt(datetime.slice(12, 14)),
    ),
  );
};
