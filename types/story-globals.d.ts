/* The story's JavaScript files are merged into one script by Tweego, so each
   file's top-level globals are visible to the ones loaded after it. These
   declarations give the editor's TypeScript server those names; the runtime
   objects stay untyped because SugarCube 2 ships no type declarations. */

declare const jQuery: any;
declare const SugarCube: any;

interface Window {
  Stage: any;
  Layout: any;
  CamSettings: any;
  CamSettingsDefaults: any;
  Reveal: any;
  Voice: any;
  VoiceLetters: any;
  SugarCube: any;
}
