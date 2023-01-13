import metaversefile from 'metaversefile';
const { useApp, useLoaders, usePhysics, useCleanup } = metaversefile;
const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

export default e => {
  const app = useApp();
  const physics = usePhysics();

  app.name = 'NXS-001 HelperBot';

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

  let live = true;
  let reactApp = null;
  const physicsIds = [];
  e.waitUntil(
    (async () => {
      const u = `${baseUrl}HelperBot.glb`;
      let o = await new Promise((resolve, reject) => {
        const { gltfLoader } = useLoaders();
        gltfLoader.load(u, resolve, function onprogress() { }, reject);
      });
      if (!live) {
        o.destroy();
        return;
      }
      app.glb = o;
      o = o.scene;
      app.add(o);

      const physicsId = physics.addGeometry(o);
      physicsIds.push(physicsId);
    })(),
  );

  useCleanup(() => {
    live = false;
    reactApp && reactApp.destroy();
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  });

  return app;
};
