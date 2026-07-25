import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

export class AppStorage {
  static async setItem(key: string, value: string) {
    if (Capacitor.isNativePlatform()) {
      if (key === "rig_workspace" || key === "anim_workspace" || key === "id_projects" || key === "id_groups") {
         await Filesystem.writeFile({
           path: `${key}.json`,
           data: value,
           directory: Directory.Data,
           encoding: Encoding.UTF8,
         });
      } else {
         await Preferences.set({ key, value });
      }
    } else {
      localStorage.setItem(key, value);
    }
  }

  static async getItem(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      if (key === "rig_workspace" || key === "anim_workspace" || key === "id_projects" || key === "id_groups") {
         try {
           const result = await Filesystem.readFile({
             path: `${key}.json`,
             directory: Directory.Data,
             encoding: Encoding.UTF8,
           });
           return result.data as string;
         } catch(e) {
           return null;
         }
      } else {
         const { value } = await Preferences.get({ key });
         return value;
      }
    } else {
      return localStorage.getItem(key);
    }
  }
}
