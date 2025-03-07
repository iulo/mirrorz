import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { Link, useRouteMatch, useParams, generatePath, useHistory } from "react-router-dom";
import Icon from './Icon';
import { Summary, statusMapper, statusSum, StatusList } from './Status';
import { ParsedMirror } from "../schema";
import { groupBy } from "./utils";

const Group = React.memo((
  { group, entries, filtered, defaultCollapse = true }:
    { group: string, entries: ParsedMirror[], filtered: boolean, defaultCollapse?: boolean }) => {
  const match = useRouteMatch();
  const [collapse, setCollapse] = useState(defaultCollapse);
  const toggleCollapse = useCallback(() => setCollapse(c => !c), []);

  const summary = useMemo(() =>
    <Summary sum={statusSum(entries.map(({ status }) => statusMapper(status)))} />,
    [entries]);

  return (
    <div className={"group" + (filtered ? " filtered" : "") + (collapse ? "" : " group-expanded")}>
      <Link to={generatePath(match.path, { filter: encodeURIComponent(group) })}>
        <div className="group-header" id={group} onClick={toggleCollapse}>
          <h2 className="heading">
            {collapse ?
              (<Icon>add</Icon>) :
              (<Icon>remove</Icon>)
            }
            {group}
          </h2>
          <div>
            {summary}
          </div>
        </div>
      </Link>
      <div className="group-items">
        {collapse == false && entries.sort((a, b) => a.source.localeCompare(b.source)).map(({ full, help, upstream, desc, status, source, size, note }, idx) => (
          <div key={idx}>
            <h3>
              <a href={full} target="_blank">
                {source}
              </a>
              {help && (
                <a className="help" href={help} target="_blank">
                  <Icon title="Help">help</Icon>
                </a>
              )}
            </h3>
            {upstream && (
              <div className="upstream">
                <Icon>outbound</Icon>
                {upstream}
              </div>
            )}
            {status && (
              <StatusList mapper={statusMapper(status)} />
            )}
            {size && (
              <div className="size">
                <Icon>save</Icon>
                {size}
              </div>
            )}
            {note && (
              <div className="note">
                <Icon>note</Icon>
                {note}
              </div>
            )}
            {desc && (
              <div className="desc">{desc}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export default React.memo(({ mirrors }: { mirrors: ParsedMirror[] }) => {
  const { t, i18n } = useTranslation();
  const history = useHistory(), match = useRouteMatch(), params = useParams() as { filter?: string };
  const [filter, setFilter] = useState(params.filter ?? "");

  // Clustering
  const grouped = useMemo(() =>
    Object.entries(groupBy(mirrors, m => m.cname))
      .map(([k, v]) => ({ sortKey: k.toLowerCase(), group: k, entries: v }))
    , [mirrors]);

  const updateFilter = useCallback((ev) => setFilter(ev.target.value), []);
  const uploadFilter = useCallback((ev) => {
    if (ev.key === 'Enter')
      history.push(generatePath(match.path, { filter: ev.target.value }));
  }, []);

  const regex = useMemo(() => {
    let regex;
    try {
      if (filter === '')
        regex = null;
      else
        // user input may be invalid regex
        regex = new RegExp(filter, 'i');
    } catch (error) {
      regex = null;
    }
    if (regex !== null) console.log("valid regex:", regex);
    return regex;
  }, [filter]);
  const begin = performance.now();
  const filtered = grouped
    .map((e) => {
      let m = null;
      let filtered = false;
      let index = 1e15;
      if (regex !== null) {
        m = regex.exec(e.group);
        filtered = m === null;
        if (!filtered)
          index = m!.index;
      }
      return { ...e, filtered, index, defaultCollapse: filter !== e.group };
    })
    .sort((a, b) => {
      if (a.index == b.index)
        return a.sortKey.localeCompare(b.sortKey);
      return a.index - b.index;
    });
  const end = performance.now();
  //console.log(`Sort`, end - begin);

  return (
    <div className={"mirrorz"}>
      <div className="search">
        <input value={filter} onChange={updateFilter} onKeyDown={uploadFilter} placeholder={t("mirrors_prompt")} />
        <Icon>search</Icon>
      </div>

      <div className="mirrors">
        {filtered.map(({ group, entries, filtered, defaultCollapse }) => (
          <Group key={group} filtered={filtered} group={group} entries={entries} defaultCollapse={defaultCollapse} />
        ))}
      </div>
    </div>
  );
});
