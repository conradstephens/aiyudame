import { set } from "idb-keyval";

export const storeResponse = async (language: string, response: string) => {
  switch (language) {
    case "en":
      await set("previousEnglishResponse", response);
      break;
    case "it":
      await set("previousItalianResponse", response);
      break;
    default:
      await set("previousSpanishResponse", response);
      break;
  }
};
