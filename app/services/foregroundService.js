import * as Location from "expo-location";
import BackgroundService from "react-native-background-actions";
import api from "./api";

const sleep = (time) =>
  new Promise((resolve) => setTimeout(() => resolve(), time));

// You can do anything in your task such as network requests, timers and so on,
// as long as it doesn't touch UI. Once your task completes (i.e. the promise is resolved),
// React Native will go into "paused" mode (unless there are other tasks running,
// or there is a foreground app).
const veryIntensiveTask = async (taskDataArguments) => {
  const permissions = await Location.requestBackgroundPermissionsAsync();
  if (!permissions.granted) {
    console.log("ForegroundService: background permission not granted");
    return;
  }
  // console.log("ForegroundService: background task started");
  // Example of an infinite loop task
  await new Promise(async (resolve) => {
    while (BackgroundService.isRunning()) {
      // console.log("Runned in background");
      try {
        const location = await Location.getCurrentPositionAsync({});
        const response = await api.patch("/users/drivers/coordinates", {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        if (response.status === 200 && BackgroundService.isRunning()) {
          BackgroundService.updateNotification({
            taskTitle: "Localização ativa",
            taskDesc:
              "Sincronizado. (Ùltima atualização: " +
              new Date().toLocaleTimeString() +
              ")",
          });
        }
      } catch (error) {
        console.log(error);
        if (BackgroundService.isRunning()) {
          BackgroundService.updateNotification({
            taskTitle: "Localização inativa",
            taskDesc:
              "Erro ao sincronizar. (Última tentativa: " +
              new Date().toLocaleTimeString() +
              ")",
          });
        }
      }

      await sleep(taskDataArguments.delay);
    }
  });
  // console.log("ForegroundService: background task stopped");
};
const options = {
  taskName: "Localizador",
  taskTitle: "Localizador ativo",
  taskDesc: "Sincronizando localização...",
  taskIcon: { name: "ic_launcher", type: "mipmap" },

  color: "#ffffff",
  //   linkingURI: "yourSchemeHere://chat/jane", // See Deep Linking for more info
  parameters: {
    delay: 30000,
  },
};

// await BackgroundService.start(veryIntensiveTask, options);
// await BackgroundService.updateNotification({
//   taskDesc: "New ExampleTask description",
// }); // Only Android, iOS will ignore this call
// // iOS will also run everything here in the background until .stop() is called
// await BackgroundService.stop();

const foregroundService = {
  isRunning: () => BackgroundService.isRunning(),
  start: async () => {
    if (BackgroundService.isRunning()) {
      return;
    }
    await BackgroundService.start(veryIntensiveTask, options);
  },
  stop: async () => {
    if (!BackgroundService.isRunning()) {
      return;
    }
    await BackgroundService.stop();
  },
};

export default foregroundService;
