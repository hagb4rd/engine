pc.extend(pc, function () {
    'use strict';

    var onTextureAssetChanged = function (asset, attribute, newValue, oldValue) {
        if (attribute !== 'resource') {
            return;
        }

        var material = this;
        var dirty = false;

        if (oldValue) {
            for (var key in material) {
                if (material.hasOwnProperty(key)) {
                    if (material[key] === oldValue) {
                        material[key] = newValue;
                        dirty = true;
                    }
                }
            }
        }

        if (dirty) {
            material.update();
        } else {
            asset.off('change', onTextureAssetChanged, material);
        }
    };

    var MaterialHandler = function (assets) {
        this._assets = assets;
    };

    MaterialHandler.prototype = {
        load: function (url, callback) {
            if (pc.string.startsWith(url, "asset://")) {

            } else {
                // Loading from URL (engine-only)
                pc.net.http.get(url, function(response) {
                    if (callback) {
                        callback(null, response);
                    }
                }, {
                    error: function (status, xhr, e) {
                        if (callback) {
                            callback(pc.string.format("Error loading material: {0} [{1}]", url, status));
                        }
                    }
                });
            }
        },

        open: function (url, data) {
            var material = new pc.PhongMaterial();
            material.init(data);
            material._data = data; // temp storage in case we need this during patching (engine-only)
            return material;
        },

        patch: function (asset, assets) {
            if (asset.data.shader === undefined) {
                // for engine-only users restore original material data
                asset.data = asset.resource._data;
                delete asset.resource._data;
            }
            this._updatePhongMaterial(asset, asset.data, assets);

            // handle changes to the material
            asset.off('change', this._onAssetChange, this);
            asset.on('change', this._onAssetChange, this);
        },

        _onAssetChange: function (asset, attribute, value) {
            if (attribute === 'data') {
                this._updatePhongMaterial(asset, value, this._assets);
            }
        },

        _updatePhongMaterial: function (asset, data, assets) {
            var material = asset.resource;

            if (asset.file) {
                var dir = pc.path.getDirectory(asset.getFileUrl());
            }

            data.parameters.push({
                name: 'shadingModel',
                type: 'float',
                data: data.shader === 'blinn' ? pc.SPECULAR_BLINN : pc.SPECULAR_PHONG
            });

            var pathMapping = (data.mapping_format === "path");
            var id;

            // Replace texture ids with actual textures
            // Should we copy 'data' here instead of updating in place?
            // TODO: This calls material.init() for _every_ texture and cubemap field in the texture with an asset. Combine this into one call to init!
            data.parameters.forEach(function (param, i) {
                if (param.type === 'texture' && param.data && !(param.data instanceof pc.Texture)) {
                    if (pathMapping) {
                        asset = assets.getByUrl(pc.path.join(dir, param.data));
                    } else {
                        id = param.data;
                        asset = assets.get(param.data);
                    }

                    if (asset) {
                        asset.ready(function (asset) {
                            data.parameters[i].data = asset.resource;
                            material.init(data); // Q: better just to update single field?

                            asset.off('change', onTextureAssetChanged, material);
                            asset.on('change', onTextureAssetChanged, material);
                        });
                        assets.load(asset);
                    } else if (id) {
                        assets.once("add:" + id, function (asset) {
                            asset.ready(function (asset) {
                                data.parameters[i].data = asset.resource;
                                material.init(data);

                                asset.off('change', onTextureAssetChanged, material);
                                asset.on('change', onTextureAssetChanged, material);
                            });
                            assets.load(asset);
                        });
                    } else if (pathMapping) {
                        assets.once("add:url:" + pc.path.join(dir, param.data), function (asset) {
                            asset.ready(function (asset) {
                                data.parameters[i].data = asset.resource;
                                material.init(data);

                                asset.off('change', onTextureAssetChanged, material);
                                asset.on('change', onTextureAssetChanged, material);
                            });
                            assets.load(asset);
                        });
                    }
                } else if (param.type === 'cubemap' && param.data && !(param.data instanceof pc.Texture)) {
                    if (pathMapping) {
                        asset = assets.getByUrl(pc.path.join(dir, param.data));
                    } else {
                        id = param.data;
                        asset = assets.get(param.data);
                    }

                    if (asset) {
                        asset.ready(function (asset) {
                            param.data = asset.resource;
                            // if this is a prefiltered map, then extra resources are present
                            if (asset.resources.length > 1) {
                                data.parameters.push({
                                    name: 'prefilteredCubeMap128',
                                    data: asset.resources[1]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap64',
                                    data: asset.resources[2]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap32',
                                    data: asset.resources[3]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap16',
                                    data: asset.resources[4]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap8',
                                    data: asset.resources[5]
                                });
                                data.parameters.push({
                                    name: 'prefilteredCubeMap4',
                                    data: asset.resources[6]
                                });
                            }
                            material.init(data);

                            asset.off('change', onTextureAssetChanged, material);
                            asset.on('change', onTextureAssetChanged, material);
                        });
                        assets.load(asset);
                    } else if (id) {
                        assets.once("add:" + id, function (asset) {
                            asset.ready(function (asset) {
                                // if this is a prefiltered map, then extra resources are present
                                param.data = asset.resource;
                                if (asset.resources.length > 1) {
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap128',
                                        data: asset.resources[1]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap64',
                                        data: asset.resources[2]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap32',
                                        data: asset.resources[3]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap16',
                                        data: asset.resources[4]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap8',
                                        data: asset.resources[5]
                                    });
                                    data.parameters.push({
                                        name: 'prefilteredCubeMap4',
                                        data: asset.resources[6]
                                    });
                                }
                                material.init(data);

                                asset.off('change', onTextureAssetChanged, material);
                                asset.on('change', onTextureAssetChanged, material);
                            });
                            assets.load(asset);
                        });
                    } else if (pathMapping) {
                        assets.once("add:url:" + pc.path.join(dir, param.data), function (asset) {
                            asset.ready(function (asset) {
                                data.parameters[i].data = asset.resource;
                                material.init(data);

                                asset.off('change', onTextureAssetChanged, material);
                                asset.on('change', onTextureAssetChanged, material);
                            });
                            assets.load(asset);
                        });
                    }
                }
            });

            material.init(data);
        }
    };

    return {
        MaterialHandler: MaterialHandler
    };
}());
