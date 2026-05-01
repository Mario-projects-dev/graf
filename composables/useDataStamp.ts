// Shared "last fetched" timestamp shown in the footer.
import { ref } from "vue";

const stamp = ref<string>("");

export function useDataStamp() {
  return stamp;
}

export function markDataFetched() {
  stamp.value = new Date().toLocaleString("sk-SK");
}
