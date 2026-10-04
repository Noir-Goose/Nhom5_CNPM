import { mockPois } from "../data/mockPois";

export const loadPois = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockPois);
    }, 300);
  });
};