import metaversefile from 'metaversefile';
const { useApp, useFrame, useLoaders, useCamera, usePhysics, useCleanup, useChatManager, useText, useThree } = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

import SamJs from './samjs.esm.js'
const sam = new SamJs()

const THREE = useThree();

const Text = useText();

async function getTextMesh(
  text = '',
  font = './fonts/Plaza Regular.ttf',
  fontSize = 0.5,
  anchorX = 'left',
  anchorY = 'middle',
  color = 0x000000,
) {
  const textMesh = new Text();
  textMesh.text = text;
  textMesh.font = font;
  textMesh.fontSize = fontSize;
  textMesh.color = color;
  textMesh.anchorX = anchorX;
  textMesh.anchorY = anchorY;
  textMesh.frustumCulled = false;
  
  textMesh.outlineWidth = 0.01,
  textMesh.outlineColor = 0x000000,
  await new Promise(resolve => {
    textMesh.sync(resolve);
  });
  return textMesh;
}

const getResponse = async ({ text, speaker, agent, spellName, textMesh }) => {
  // Send the message to the localhost endpoint
  const client = "webaverse";
  const channelId = "message";
  const channel = "message";

  try {
    const url = encodeURI(`http://localhost:8001/spells/${spellName}`)

    // rewrite the axios post in fetch
    fetch(`${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Input: {
          input: text,
          speaker: speaker,
          agent: agent,
          client: client,
          channelId: channelId,
          channel: channel,
        }
      })
    }).then(async (response) => {
      console.log('fetch response', response)

      // parse the response
      const data = await response.json();

      const outputs = data.outputs;

      const outputKey = Object.keys(outputs)[0];

      const output = outputs[outputKey];

      let allOutput = output;

      let visibleOut = ''

      const maxCharacterLength = 100;

      // create a timer that adds one letter from allOutput to visibleOutput every 100ms
      const interval = setInterval(() => {
        if (allOutput.length > 0) {
          visibleOut += allOutput[0];
          const lines = visibleOut.split('\n');
          if(lines[lines.length - 1].length > maxCharacterLength){
            visibleOut += '\n';
          }
          allOutput = allOutput.slice(1);
          if(textMesh?.text) textMesh.text = visibleOut;
          visibleOut = visibleOut
            .split('. ').join('.\n')
            .split('? ').join('?\n')
        } else {
          clearInterval(interval);
          setTimeout(() => {
            if(textMesh?.text) textMesh.text = ' ';
          }, 6000)
        }
      }, 30);
      
      

      sam.speak(output.split('\n')[0])

      // write a fetch request to https://voice.webaverse.com/tts with the argument "s" being the value of the output
      // const ttsUrl = encodeURI(`https://voice.webaverse.com/tts?s=${output}`)
      // fetch(`${ttsUrl}`, {
      //   method: 'GET',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   }
      // }).then(async (response) => {
      //   console.log('tts response', response)
      //   const data = await response.json();
      //   console.log('tts data', data
      // })

      // translate the above into rust



      console.log('output', output)
      return output;

    });
  } catch (error) {
    console.error(error);
  }
};

export default function (e) {
  const app = useApp();
  const physics = usePhysics();
  let textGroup = null;
  let textMesh = null;
  const activateCb = async activated => {

    console.log('activated', activated);

  };

  app.addEventListener('activate', e => {
    activateCb && activateCb(true);
  });

  app.addEventListener('wearupdate', e => {
    if (!e.wear) {
      activateCb && activateCb(false);
    }
  });

  // add an event listener for the 'wear' event
  const { gltfLoader } = useLoaders();

  let live = true;
  const physicsIds = [];
  e.waitUntil(
    (async () => {
      // ai-generated text display
      (async () => {
        const font = './fonts/GeosansLight.ttf';
        const fontSize = 0.35;
        const anchorX = 'center';
        const anchorY = 'top';
        const color = "#ff0000";
        textMesh = await getTextMesh(
          ' ',
          font,
          fontSize,
          anchorX,
          anchorY,
          color
        );
        textGroup = new THREE.Group();
        textGroup.add(textMesh);

        textMesh.position.set(0, .5, .4);

        textMesh.scale.set(0.25, 0.25, 0.25);
        textMesh.updateMatrixWorld(true);

        app.add(textGroup);
      })()
  
      useFrame(() => {
        textGroup.updateMatrixWorld(true);
      })

      // create 3d model
      const u = `${baseUrl}HelperBot.glb`;

      let o = await new Promise((resolve, reject) => {
        gltfLoader.load(u, resolve, function onprogress() { }, reject);
      });

      if (!live) {
        o.destroy();
        return;
      }
      app.glb = o;
      o = o.scene;

      console.log('o is', o)
      o.position.set(0, 0, 0);
      o.updateMatrixWorld(true);

      app.add(o);

      const physicsId = physics.addGeometry(o);
      physicsIds.push(physicsId);

      // subscribe to chat manager messageadd event
      const chatManager = useChatManager();
      chatManager.addEventListener('messageadd', async (e) => {
        console.log('messageadd from bot', e)

        const message = e.data.message.message;
        const player = e.data.player.name;
        const playerId = e.data.player.playerId;
        const position = e.data.player.position;
        const quaternion = e.data.player.quaternion;

        const response = await getResponse({
          text: message,
          speaker: player,
          agent: app.name,
          spellName: 'webaverse_ai_pet',
          textMesh
        });

        console.log('message', message)
        console.log('player', player)
        console.log('playerId', playerId)
        console.log('position', position)
        console.log('quaternion', quaternion)

        console.log('response', response)

      });
    })(),
  );

  useCleanup(() => {
    live = false;
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });

  return app;
};
