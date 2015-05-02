pc.extend(pc, function () {
    'use strict';

    var AnimationHandler = function () {
    };

    AnimationHandler.prototype = {
        load: function (request, options) {
            var promise = new pc.promise.Promise(function (resolve, reject) {
                var url = request.canonical;
                var dir = pc.path.getDirectory(url);

                pc.net.http.get(url, function (response) {
                    try {
                        resolve(response);
                    } catch (e) {
                        reject(pc.string.format("An error occured while loading animation from: '{0}'", url));
                    }
                }.bind(this), {
                    cache: options.cache,
                    error: function (errors) {
                        reject(errors);
                    }
                });
            });

            return promise;
        },

        open: function (data, request, options) {
            return this["_parseAnimationV" + data.animation.version](data);
        },

        _parseAnimationV3: function (data) {
            var animData = data.animation;

            var anim = new pc.Animation();
            anim.setName(animData.name);
            anim.setDuration(animData.duration);

            for (var i = 0; i < animData.nodes.length; i++) {
                var node = new pc.Node();

                var n = animData.nodes[i];
                node._name = n.name;

                for (var j = 0; j < n.keys.length; j++) {
                    var k = n.keys[j];

                    var t = k.time;
                    var p = k.pos;
                    var r = k.rot;
                    var s = k.scale;
                    var pos = new pc.Vec3(p[0], p[1], p[2]);
                    var rot = new pc.Quat().setFromEulerAngles(r[0], r[1], r[2]);
                    var scl = new pc.Vec3(s[0], s[1], s[2]);

                    var key = new pc.Key(t, pos, rot, scl);

                    node._keys.push(key);
                }

                anim.addNode(node);
            }

            return anim;
        },

        _parseAnimationV4: function (data) {
            var animData = data.animation;

            var anim = new pc.Animation();
            anim.setName(animData.name);
            anim.setDuration(animData.duration);

            for (var i = 0; i < animData.nodes.length; i++) {
                var node = new pc.Node();

                var n = animData.nodes[i];
                node._name = n.name;

                var defPos = n.defaults.p;
                var defRot = n.defaults.r;
                var defScl = n.defaults.s;

                for (var j = 0; j < n.keys.length; j++) {
                    var k = n.keys[j];

                    var t = k.t;
                    var p = defPos ? defPos : k.p;
                    var r = defRot ? defRot : k.r;
                    var s = defScl ? defScl : k.s;
                    var pos = new pc.Vec3(p[0], p[1], p[2]);
                    var rot = new pc.Quat().setFromEulerAngles(r[0], r[1], r[2]);
                    var scl = new pc.Vec3(s[0], s[1], s[2]);

                    var key = new pc.Key(t, pos, rot, scl);

                    node._keys.push(key);
                }

                anim.addNode(node);
            }

            return anim;
        }
    };

    return {
        AnimationHandler: AnimationHandler
    };
}());