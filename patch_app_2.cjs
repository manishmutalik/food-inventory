const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Restore Servings UI
content = content.replace(
`                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Selling Price</h4>`,
`                                </div>
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100">
                                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Servings</h4>
                                  <ServingsInput
                                    value={item.servings ?? 1}
                                    onChange={(num) => updateMenuItemField(item.id, 'servings', num)}
                                    className="w-16 bg-stone-50 border border-stone-150 rounded-xl px-2 py-1 text-sm font-mono font-bold text-stone-700 focus:ring-2 focus:ring-primary/20 outline-none mt-0.5"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Selling Price</h4>`
);

// 2. Restore Nutrition Profile Per Serving
content = content.replace(
`                              <div className="bg-stone-50 p-6 border-t border-stone-100 flex-1">
                                <h4 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                                  <Activity size={16} className="text-primary" />
                                  Nutrition Profile
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{calories.toFixed(0)}</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Calories</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{protein.toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Protein</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{carbs.toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Carbs</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{fat.toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Fat</div>
                                  </div>
                                </div>
                                
                                {sugar > 0 && (
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-sm font-bold text-stone-600">Includes {sugar.toFixed(1)}g Sugar</div>
                                  </div>
                                )}
                              </div>`,
`                              <div className="bg-stone-50 p-6 border-t border-stone-100 flex-1">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                                    <Activity size={16} className="text-primary" />
                                    Nutrition Profile
                                  </h4>
                                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Per Serving ({servings} serving{servings > 1 ? 's' : ''}/recipe)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{(calories / servings).toFixed(0)}</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Calories</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{(protein / servings).toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Protein</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{(carbs / servings).toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Carbs</div>
                                  </div>
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-xl font-bold font-serif text-stone-800">{(fat / servings).toFixed(1)}g</div>
                                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Fat</div>
                                  </div>
                                </div>
                                
                                {sugar > 0 && (
                                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 text-center">
                                    <div className="text-sm font-bold text-stone-600">Includes {(sugar / servings).toFixed(1)}g Sugar</div>
                                  </div>
                                )}
                              </div>`
);

fs.writeFileSync('src/App.tsx', content);
console.log('Restored Servings successfully.');
