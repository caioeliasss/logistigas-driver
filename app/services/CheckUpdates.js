import * as Updates from "expo-updates";
import { useEffect } from "react";

export default function CheckUpdates() {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          // Notify user about the update and reload the app
          alert(
            "Uma nova atualização está disponível. O aplicativo será reiniciado para aplicar a atualização.",
          );
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.error("Erro ao verificar atualizações:", e);
      }
    };
    checkForUpdates();
  }, []);

  return null;
}
