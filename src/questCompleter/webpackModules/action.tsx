import spacepack from "@moonlight-mod/wp/spacepack_spacepack";;
import Commands from "@moonlight-mod/wp/commands_commands";
import { InputType, CommandType } from "@moonlight-mod/types/coreExtensions/commands";
import React from '@moonlight-mod/wp/react';
import ErrorBoundary from '@moonlight-mod/wp/common_ErrorBoundary';

const Button = spacepack.findByCode(".NONE,disabled:", ".PANEL_BUTTON")[0].exports.Z;
let hoverStatus = null;

export function completeQuest() {
  delete window.$;
  let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
  webpackChunkdiscord_app.pop();

  let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getStreamerActiveStreamMetadata).exports.Z;
  let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getRunningGames).exports.ZP;
  let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getQuest).exports.Z;
  let ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.getAllThreadsForParent).exports.Z;
  let GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.ZP?.getSFWDefaultChannel).exports.ZP;
  let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.Z?.__proto__?.flushWaitQueue).exports.Z;
  let api = Object.values(wpRequire.c).find(x => x?.exports?.tn?.get).exports.tn;

  let quest = [...QuestsStore.quests.values()].find(x => x.id !== "1248385850622869556" && x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now())
  let isApp = typeof DiscordNative !== "undefined"
  if(!quest) {
    console.log("You don't have any uncompleted quests!")
  } else {
    const pid = Math.floor(Math.random() * 30000) + 1000

    const applicationId = quest.config.application.id
    const applicationName = quest.config.application.name
    const questName = quest.config.messages.questName
    const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2
    const taskName = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"].find(x => taskConfig.tasks[x] != null)
    const secondsNeeded = taskConfig.tasks[taskName].target
    let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0

    if(taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
      const maxFuture = 10, speed = 7, interval = 1
      const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime()
      let completed = false
      let fn = async () => {
        while(true) {
          const maxAllowed = Math.floor((Date.now() - enrolledAt)/1000) + maxFuture
          const diff = maxAllowed - secondsDone
          const timestamp = secondsDone + speed
          if(diff >= speed) {
            const res = await api.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}})
            completed = res.body.completed_at != null
            secondsDone = Math.min(secondsNeeded, timestamp)
          }

          if(timestamp >= secondsNeeded) {
            break
          }
          await new Promise(resolve => setTimeout(resolve, interval * 1000))
        }
        if(!completed) {
          await api.post({url: `/quests/${quest.id}/video-progress`, body: {timestamp: secondsNeeded}})
        }
        console.log("Quest completed!")
      }
      fn()
      console.log(`Spoofing video for ${questName}.`)
    } else if(taskName === "PLAY_ON_DESKTOP") {
      if(!isApp) {
        console.log("This no longer works in browser for non-video quests. Use the desktop app to complete the", questName, "quest!")
      } else {
        api.get({url: `/applications/public?application_ids=${applicationId}`}).then(res => {
          const appData = res.body[0]
          const exeName = appData.executables.find(x => x.os === "win32").name.replace(">","")

          const fakeGame = {
            cmdLine: `C:\\Program Files\\${appData.name}\\${exeName}`,
            exeName,
            exePath: `c:/program files/${appData.name.toLowerCase()}/${exeName}`,
            hidden: false,
            isLauncher: false,
            id: applicationId,
            name: appData.name,
            pid: pid,
            pidPath: [pid],
            processName: appData.name,
            start: Date.now(),
          }
          const realGames = RunningGameStore.getRunningGames()
          const fakeGames = [fakeGame]
          const realGetRunningGames = RunningGameStore.getRunningGames
          const realGetGameForPID = RunningGameStore.getGameForPID
          RunningGameStore.getRunningGames = () => fakeGames
          RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid)
          FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames})

          let fn = data => {
            let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value)
            console.log(`Quest progress: ${progress}/${secondsNeeded}`)
            hoverStatus = (`${progress}/${secondsNeeded}`)

            if(progress >= secondsNeeded) {
              console.log("Quest completed!")
              hoverStatus = null

              RunningGameStore.getRunningGames = realGetRunningGames
              RunningGameStore.getGameForPID = realGetGameForPID
              FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: []})
              FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)
            }
          }
          FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)

          console.log(`Spoofed your game to ${applicationName}. Wait for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`)
        })
      }
    } else if(taskName === "STREAM_ON_DESKTOP") {
      if(!isApp) {
        console.log("This no longer works in browser for non-video quests. Use the desktop app to complete the", questName, "quest!")
      } else {
        let realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata
        ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
          id: applicationId,
          pid,
          sourceName: null
        })

        let fn = data => {
          let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value)
          console.log(`Quest progress: ${progress}/${secondsNeeded}`)
          hoverStatus = (`${progress}/${secondsNeeded}`)

          if(progress >= secondsNeeded) {
            console.log("Quest completed!")
            hoverStatus = null

            ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc
            FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)
          }
        }
        FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn)

        console.log(`Spoofed your stream to ${applicationName}. Stream any window in vc for ${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.`)
        console.log("Remember that you need at least 1 other person to be in the vc!")
      }
    } else if(taskName === "PLAY_ACTIVITY") {
      const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id
      const streamKey = `call:${channelId}:1`

      let fn = async () => {
        console.log("Completing quest", questName, "-", quest.config.messages.questName)

        while(true) {
          const res = await api.post({url: `/quests/${quest.id}/heartbeat`, body: {stream_key: streamKey, terminal: false}})
          const progress = res.body.progress.PLAY_ACTIVITY.value
          console.log(`Quest progress: ${progress}/${secondsNeeded}`)
          hoverStatus = (`${progress}/${secondsNeeded}`)

          await new Promise(resolve => setTimeout(resolve, 20 * 1000))

          if(progress >= secondsNeeded) {
            await api.post({url: `/quests/${quest.id}/heartbeat`, body: {stream_key: streamKey, terminal: true}})
            break
          }
        }

        console.log("Quest completed!")
        hoverStatus = null
      }
      fn()
    }
  }
}

function makeIcon() {
  return () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill={"currentColor"}
        d="M7.5 21.7a8.95 8.95 0 0 1 9 0 1 1 0 0 0 1-1.73c-.6-.35-1.24-.64-1.9-.87.54-.3 1.05-.65 1.52-1.07a3.98 3.98 0 0 0 5.49-1.8.77.77 0 0 0-.24-.95 3.98 3.98 0 0 0-2.02-.76A4 4 0 0 0 23 10.47a.76.76 0 0 0-.71-.71 4.06 4.06 0 0 0-1.6.22 3.99 3.99 0 0 0 .54-5.35.77.77 0 0 0-.95-.24c-.75.36-1.37.95-1.77 1.67V6a4 4 0 0 0-4.9-3.9.77.77 0 0 0-.6.72 4 4 0 0 0 3.7 4.17c.89 1.3 1.3 2.95 1.3 4.51 0 3.66-2.75 6.5-6 6.5s-6-2.84-6-6.5c0-1.56.41-3.21 1.3-4.51A4 4 0 0 0 11 2.82a.77.77 0 0 0-.6-.72 4.01 4.01 0 0 0-4.9 3.96A4.02 4.02 0 0 0 3.73 4.4a.77.77 0 0 0-.95.24 3.98 3.98 0 0 0 .55 5.35 4 4 0 0 0-1.6-.22.76.76 0 0 0-.72.71l-.01.28a4 4 0 0 0 2.65 3.77c-.75.06-1.45.33-2.02.76-.3.22-.4.62-.24.95a4 4 0 0 0 5.49 1.8c.47.42.98.78 1.53 1.07-.67.23-1.3.52-1.91.87a1 1 0 1 0 1 1.73Z"
      />
    </svg>
  );
}

export function CompleteQuestButtonInternal() {
  return (
    <Button
      tooltipText={(hoverStatus === null) ? "Complete quest!" : `Quest progress: ${hoverStatus}` }
      icon={makeIcon()}
      role="button"
      onClick={ () => completeQuest() }
    />
  );
}

export function CompleteQuestButton() {
  return <ErrorBoundary>
    <CompleteQuestButtonInternal />
  </ErrorBoundary>
}

Commands.registerCommand({
  id: "completeQuest",
  description: "completes accepted quests!",
  inputType: InputType.BUILT_IN,
  type: CommandType.CHAT,
  options: [],
  execute: () => {
    completeQuest();
  }
});
