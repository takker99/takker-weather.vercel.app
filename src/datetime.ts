export const toUTCyyyyMM = (time: Date): string => {
  const year = `${time.getUTCFullYear()}`.padStart(4, "0");
  const month = `${time.getUTCMonth() + 1}`.padStart(2, "0");
  return year + month;
};
export const toUTCyyyyMMddHHmm = (time: Date): string => {
  const date = `${time.getUTCDate()}`.padStart(2, "0");
  const hours = `${time.getUTCHours()}`.padStart(2, "0");
  const minutes = `${time.getUTCMinutes()}`.padStart(2, "0");
  return toUTCyyyyMM(time) + date + hours + minutes;
};
