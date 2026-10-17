export type SteamUser = {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
};

export type GameEntry = {
  appId: number;
  name: string;
  playtimeForever: number;
  imgIconUrl: string | null;
  headerImage: string;
  /** Approximate install size shown in UI (GB). Demo values when Steam size is unknown. */
  installSizeGb: number;
  /** Bytes kept in the browser for a playable session slice + input/state cache. */
  cacheSliceMb: number;
  owned: boolean;
  /** Web-native demo playable entirely in-browser; AAA titles use stream mode. */
  mode: "stream" | "native-demo";
};

export type SessionPayload = {
  user: SteamUser;
  demo: boolean;
  exp: number;
};
