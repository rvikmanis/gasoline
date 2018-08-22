import { Store } from "gasoline";
import rootModel from "./models";

const store = new Store(rootModel);

try {
  const storeDump = JSON.parse(localStorage.getItem("todos"))
  if (storeDump) {
    store.load(storeDump);
    console.log("Populated store from localStorage")
  } else {
    console.log("Initialized empty store")
  }
} catch (e) {
  console.log(`Failed loading data into store: ${e.message}`);
}

store.ready(() => {
  rootModel.state$.auditTime(500).subscribe(() => {
    const storeDump = JSON.stringify(store.dump())
    localStorage.setItem("todos", storeDump)
    console.log("Synced store to localStorage")
  })
})

store.start()

export { store };