import React, { Component } from 'react';

import FileOutlineIcon from 'mdi-react/FileOutlineIcon';
import FolderOutlineIcon from 'mdi-react/FolderOutlineIcon';
import { directoryRevisionWithActiveData } from '../utils/coverage';
import settings from '../settings';
import { HORIZONTAL_ELLIPSIS, HEAVY_CHECKMARK } from '../utils/symbol';

const { low, medium, high } = settings.COVERAGE_THRESHOLDS;

// DirectoryViewer loads a directory for a given revision from Mozilla's hg web.
// It uses test coverage information from Active Data to show coverage
// per sub-directory or file.
export default class DirectoryViewerContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps) {
    const { revision, path } = this.props;
    if (revision === prevProps.revision && path === prevProps.path) {
      return;
    }
    // Reset the state and fetch new data
    const newState = {
      appErr: undefined,
      coverage: undefined,
    };
    // eslint-disable-next-line react/no-did-update-set-state
    this.setState(newState);
    this.fetchData();
  }

  async fetchData(repoPath = 'mozilla-central') {
    const { revision, path } = this.props;
    if (!revision) {
      this.setState({ appErr: "Undefined URL query ('revision' field is required)" });
      return;
    }
    // Get coverage from ActiveData
    try {
      let { data: coverage } = await directoryRevisionWithActiveData(revision, path, repoPath);

      // Filter weird files from the coverage results (e.g. 'chrome:', 'data:...', 'NONE', etc)
      coverage = coverage.filter(([fileName]) => !/^(\/|chrome:|data:|obj-firefox|resource:|NONE)/.test(fileName || '/'));

      // Group by type (directory/file), sort alphabetically
      coverage = coverage.sort(([fileNameA, isDirectoryA], [fileNameB, isDirectoryB]) => {
        if (isDirectoryA !== isDirectoryB) {
          return isDirectoryB - isDirectoryA;
        }
        if (fileNameA < fileNameB) {
          return -1;
        }
        return 1;
      });

      this.setState({ coverage });
    } catch (error) {
      this.setState({ appErr: `${error.name}: ${error.message}` });
      throw error;
    }
  }

  render() {
    const { path, revision } = this.props;
    const { coverage, appErr } = this.state;

    return (
      <div>
        <div className="file-view">
          <DirectoryViewerMeta {...this.props} {...this.state} />
          { !appErr && coverage &&
            <table className="changeset-viewer">
              <tbody>
                <tr>
                  <th>File</th>
                  <th>Coverage summary</th>
                </tr>
                {coverage.map((file) => {
                  const [fileName, isDirectory, totalCovered, totalUncovered] = file;
                  const coveragePercent =
                    Math.round(100 * (totalCovered / (totalCovered + totalUncovered)));
                  let summaryClassName = high.className;
                  if (coveragePercent < medium.threshold) {
                    summaryClassName =
                      (coveragePercent < low.threshold ? low.className : medium.className);
                  }
                  const href =
                    `/#/file?revision=${revision}&path=${path}${fileName}${isDirectory ? '/' : ''}`;
                  return (
                    <tr className="changeset" key={fileName}>
                      <td className="changeset-author">
                        <a href={href}>
                          {isDirectory ? <FolderOutlineIcon /> : <FileOutlineIcon />}
                          <span className="changeset-eIcon-align">{fileName}</span>
                        </a>
                      </td>
                      <td className={`changeset-summary ${summaryClassName}`}>{coveragePercent}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
        </div>
      </div>
    );
  }
}

// This component contains metadata of the file
const DirectoryViewerMeta = ({
  revision, path, appErr, coverage,
}) => {
  const showStatus = (label, data) => (
    <li className="file-meta-li">
      {label}: {(data) ? HEAVY_CHECKMARK : HORIZONTAL_ELLIPSIS}
    </li>
  );

  return (
    <div>
      <div className="file-meta-center">
        <div className="file-meta-title">Directory Coverage</div>
        <div className="file-meta-status">
          <ul className="file-meta-ul">
            { showStatus('Coverage', coverage) }
          </ul>
        </div>
      </div>
      {appErr && <span className="error-message">{appErr}</span>}

      <div className="file-summary">
        <span className="file-path">{path}</span>
      </div>
      <div className="file-meta-revision">revision number: {revision}</div>
    </div>
  );
};

